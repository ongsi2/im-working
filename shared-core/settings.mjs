// shared-core/settings.mjs — localStorage-backed settings

const KEY = 'busy.settings';

export const defaults = Object.freeze({
  intensity: 'med',             // 'low' | 'med' | 'high'
  osChrome: 'mac',              // 'mac' | 'win' | 'off'
  volume: 0.35,                 // 0..1
  rotation: {
    enabled: false,
    baseSec: 75,                // 180 | 75 | 35
    jitterPct: 0.25,
    blacklist: [],
  },
  sound: { enabled: true },
  wakeLock: { enabled: true },
  pip: { enabled: true },
  ghostCursor: { enabled: true },
  panicScene: 'busy/email.html',
});

// Deep merge — stored values overlay defaults (forward-compat for new keys).
function merge(a, b) {
  if (Array.isArray(b)) return b.slice();
  if (b && typeof b === 'object') {
    const out = { ...a };
    for (const k of Object.keys(b)) out[k] = merge(a?.[k], b[k]);
    return out;
  }
  return b === undefined ? a : b;
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    return merge(defaults, JSON.parse(raw));
  } catch {
    return structuredClone(defaults);
  }
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch {}
}
