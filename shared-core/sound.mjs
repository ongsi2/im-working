// shared-core/sound.mjs — synthesized keystroke + click + ding

import { on } from './eventbus.mjs';

const BURST_INTERVAL_BY_INTENSITY = {
  low:  [8000, 20000],
  med:  [3000, 10000],
  high: [1000, 4000],
};
const KEYS_PER_BURST_BY_INTENSITY = { low: [2, 6], med: [3, 10], high: [5, 14] };

let ctx = null;
let masterGain = null;
let burstTimer = null;
let settings = null;
let enabled = true;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = settings?.volume ?? 0.35;
  masterGain.connect(ctx.destination);
  return ctx;
}

function playKey() {
  if (!ensureCtx() || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;

  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800 + Math.random() * 1500;
  bp.Q.value = 2 + Math.random() * 3;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.6, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);

  src.connect(bp).connect(env).connect(masterGain);
  src.start(t0);
  src.stop(t0 + 0.06);
}

function playClick() {
  if (!ensureCtx() || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(2200, t0);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.3, t0 + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
  osc.connect(env).connect(masterGain);
  osc.start(t0); osc.stop(t0 + 0.03);
}

function playDing() {
  if (!ensureCtx() || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t0);
  osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.25);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  osc.connect(env).connect(masterGain);
  osc.start(t0); osc.stop(t0 + 0.55);
}

function scheduleBurst() {
  const [minI, maxI] = BURST_INTERVAL_BY_INTENSITY[settings.intensity] || BURST_INTERVAL_BY_INTENSITY.med;
  const [minK, maxK] = KEYS_PER_BURST_BY_INTENSITY[settings.intensity] || KEYS_PER_BURST_BY_INTENSITY.med;
  const delay = minI + Math.random() * (maxI - minI);
  burstTimer = setTimeout(() => {
    if (!enabled) return scheduleBurst();
    const n = Math.floor(minK + Math.random() * (maxK - minK));
    let i = 0;
    const next = () => {
      if (!enabled) return scheduleBurst();
      playKey();
      i++;
      if (i < n) setTimeout(next, 80 + Math.random() * 200);
      else scheduleBurst();
    };
    next();
  }, delay);
}

export async function unlock() {
  ensureCtx();
  if (ctx && ctx.state === 'suspended') {
    try { await ctx.resume(); } catch {}
  }
}

export function mount(s) {
  settings = s;
  enabled = settings.sound.enabled;
  scheduleBurst();
  on('toast', () => playDing());
  on('cursor:click', () => playClick());
  // Unlock on first user gesture
  const kick = () => { unlock(); document.removeEventListener('click', kick); document.removeEventListener('keydown', kick); };
  document.addEventListener('click', kick, { once: true });
  document.addEventListener('keydown', kick, { once: true });
}

export function setEnabled(v) { enabled = !!v; }
export function setVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
export function unmount() { if (burstTimer) clearTimeout(burstTimer); }
