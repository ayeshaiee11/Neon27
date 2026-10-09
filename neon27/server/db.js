import { createClient } from '@libsql/client';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Local dev  -> file:data/neon.db (a plain SQLite file, no setup)
 * Production -> Turso (hosted SQLite) via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
 */
const url = process.env.TURSO_DATABASE_URL || 'file:data/neon.db';
if (url.startsWith('file:')) fs.mkdirSync(path.dirname(url.slice(5)), { recursive: true });

export const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  best_score INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  runs INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL, won INTEGER NOT NULL, time INTEGER NOT NULL, hits INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, descr TEXT NOT NULL, icon TEXT NOT NULL, earned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, code)
);
CREATE INDEX IF NOT EXISTS idx_users_best ON users(best_score DESC);
`;

let initPromise;
/** Creates tables once per process. */
export const init = () => (initPromise ??= db.executeMultiple(SCHEMA));

/** Run a query and return plain objects. */
export async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows.map((row) => Object.fromEntries(r.columns.map((c, i) => [c, row[i]])));
}
export const one = async (sql, args) => (await all(sql, args))[0];

/** JWT secret: env var in production; generated + stored locally for dev. */
export function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET environment variable is required');
  const file = path.join('data', '.secret');
  fs.mkdirSync('data', { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  return fs.readFileSync(file, 'utf8');
}
