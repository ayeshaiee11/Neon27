/** Badge catalogue. Every win also earns a numbered "ESCAPE #n" stamp, so each victory is rewarded. */
export const CATALOG = {
  FIRST_ESCAPE: { name: 'FIRST ESCAPE', descr: 'Escape the grid for the first time', icon: '🏁' },
  FLAWLESS:     { name: 'FLAWLESS',     descr: 'Escape without taking damage',        icon: '💎' },
  SPEED_DEMON:  { name: 'SPEED DEMON',  descr: 'Escape in under 60 seconds',          icon: '⚡' },
  OVERDRIVER:   { name: 'OVERDRIVER',   descr: 'Escape using Overdrive twice or more', icon: '🌀' },
  DRONE_SLAYER: { name: 'DRONE SLAYER', descr: 'Destroy 10 drones in one run',        icon: '🎯' },
  DATA_THIEF:   { name: 'DATA THIEF',   descr: 'Find all 3 hidden chips in one run',  icon: '🗝️' },
  VETERAN:      { name: 'VETERAN',      descr: 'Escape 5 times',                      icon: '🛡️' },
  LEGEND:       { name: 'LEGEND',       descr: 'Escape 10 times',                     icon: '👑' },
};

/** Returns the badges a finished run qualifies for. `wins` is the total including this run. */
export function evaluate(run, wins) {
  if (!run.won) return [];
  const out = [{ code: `CLEAR_${wins}`, name: `ESCAPE #${wins}`, descr: `Cleared the grid (win #${wins})`, icon: '✪' }];
  const add = (code) => out.push({ code, ...CATALOG[code] });
  if (wins === 1) add('FIRST_ESCAPE');
  if (run.hits === 0) add('FLAWLESS');
  if (run.time < 60) add('SPEED_DEMON');
  if (run.odu >= 2) add('OVERDRIVER');
  if (run.kills >= 10) add('DRONE_SLAYER');
  if (run.chips >= 3) add('DATA_THIEF');
  if (wins >= 5) add('VETERAN');
  if (wins >= 10) add('LEGEND');
  return out;
}
