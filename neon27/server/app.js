import bcrypt from 'bcryptjs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { CATALOG, evaluate } from './badges.js';
import { all, db, getSecret, init, one } from './db.js';

const SECRET = getSecret();
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.use(wrap(async (_req, _res, next) => { await init(); next(); }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, try again later' } });
const sign = (uid) => jwt.sign({ uid }, SECRET, { expiresIn: '30d' });
const requireAuth = (req, res, next) => {
  try { req.uid = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET).uid; next(); }
  catch { res.status(401).json({ error: 'Not logged in' }); }
};
const getUser = (id) => one('SELECT id, username, best_score, wins, runs FROM users WHERE id = ?', [id]);

app.post('/api/register', authLimiter, wrap(async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(username)) return res.status(400).json({ error: 'Username: 3-16 letters, numbers or _' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters' });
  try {
    const r = await db.execute({ sql: 'INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)', args: [username, await bcrypt.hash(password, 10), Date.now()] });
    const id = Number(r.lastInsertRowid);
    res.status(201).json({ token: sign(id), user: await getUser(id) });
  } catch (e) {
    if (/UNIQUE/i.test(String(e.message))) return res.status(409).json({ error: 'Username already taken' });
    throw e;
  }
}));

app.post('/api/login', authLimiter, wrap(async (req, res) => {
  const { username, password } = req.body ?? {};
  const row = typeof username === 'string' ? await one('SELECT * FROM users WHERE username = ?', [username]) : null;
  const ok = row && typeof password === 'string' && await bcrypt.compare(password, row.pass_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
  res.json({ token: sign(row.id), user: await getUser(row.id) });
}));

app.get('/api/me', requireAuth, wrap(async (req, res) => {
  const user = await getUser(req.uid);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  res.json({ user, badges: await all('SELECT code, name, descr, icon, earned_at FROM badges WHERE user_id = ? ORDER BY earned_at', [req.uid]) });
}));

app.get('/api/badges', (_req, res) => res.json(Object.entries(CATALOG).map(([code, b]) => ({ code, ...b }))));
app.get('/api/leaderboard', wrap(async (_req, res) => res.json(await all('SELECT username, best_score, wins FROM users WHERE runs > 0 ORDER BY best_score DESC LIMIT 10'))));

const within = (v, max) => Number.isFinite(v) && v >= 0 && v <= max;
app.post('/api/runs', requireAuth, wrap(async (req, res) => {
  const b = req.body ?? {};
  const run = { won: b.won === true, score: Math.floor(b.score), time: Math.floor(b.time), hits: Math.floor(b.hits), shards: Math.floor(b.shards), kills: Math.floor(b.kills), odu: Math.floor(b.odu), chips: Math.floor(b.chips) };
  const valid = typeof b.won === 'boolean' && within(run.score, 60000) && within(run.time, 3600) && within(run.hits, 100) &&
    within(run.shards, 600) && within(run.kills, 60) && within(run.odu, 20) && within(run.chips, 3) && !(run.won && run.time < 20);
  if (!valid) return res.status(400).json({ error: 'Invalid run data' });

  const user = await getUser(req.uid);
  if (!user) return res.status(401).json({ error: 'Account not found' });
  const now = Date.now(), badges = evaluate(run, user.wins + (run.won ? 1 : 0));
  const results = await db.batch([
    { sql: 'INSERT INTO runs (user_id, score, won, time, hits, created_at) VALUES (?, ?, ?, ?, ?, ?)', args: [req.uid, run.score, run.won ? 1 : 0, run.time, run.hits, now] },
    { sql: 'UPDATE users SET runs = runs + 1, wins = wins + ?, best_score = MAX(best_score, ?) WHERE id = ?', args: [run.won ? 1 : 0, run.score, req.uid] },
    ...badges.map((x) => ({ sql: 'INSERT OR IGNORE INTO badges (user_id, code, name, descr, icon, earned_at) VALUES (?, ?, ?, ?, ?, ?)', args: [req.uid, x.code, x.name, x.descr, x.icon, now] })),
  ], 'write');
  const newBadges = badges.filter((_, i) => results[i + 2].rowsAffected > 0);
  res.json({ user: await getUser(req.uid), newBadges });
}));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

export default app;
