// shared-core/vitals-core.mjs — common utilities for vitals injectors

export function pickIntensityRange(table, intensity) {
  return table[intensity] || table.med;
}

export function randRange(a, b) {
  return a + Math.random() * (b - a);
}

export function scheduleRandom(fn, rangeFn, stopFn) {
  const [min, max] = rangeFn();
  const delay = randRange(min, max) * 1000;
  const id = setTimeout(() => {
    if (stopFn?.()) return;
    try { fn(); } catch (e) { console.warn('[vitals]', e); }
    scheduleRandom(fn, rangeFn, stopFn);
  }, delay);
  return () => clearTimeout(id);
}

export function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function pad(n) { return String(n).padStart(2, '0'); }
export function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60), ss = s % 60;
  return `${pad(mm)}:${pad(ss)}`;
}
