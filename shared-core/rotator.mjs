// shared-core/rotator.mjs — rotation state machine (pure logic)

/** Fisher-Yates shuffle using provided rand fn (for testability). */
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildOrder(allScenes, blacklist, rand = Math.random) {
  const pool = allScenes.filter((s) => !blacklist.includes(s));
  return shuffle(pool, rand);
}

/** Compute next state and next path. Returns { state, nextPath } or null if empty. */
export function advance(state, rand = Math.random, now = Date.now()) {
  const { order, jitterPct = 0.25, baseSec, blacklist = [] } = state;
  if (!order.length) return null;

  let cursor = state.cursor;
  const n = order.length;
  let steps = 0;
  do {
    cursor = (cursor + 1) % n;
    steps++;
    if (steps > n) return null; // all blacklisted
  } while (blacklist.includes(order[cursor]));

  const jitter = (rand() * 2 - 1) * jitterPct;
  const nextAt = now + Math.max(20_000, baseSec * 1000 * (1 + jitter));

  return {
    state: { ...state, cursor, nextAt },
    nextPath: order[cursor],
  };
}

export const STORAGE_KEY = 'busy.rotation';

export function loadState() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
export function saveState(s) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}
export function clearState() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}
