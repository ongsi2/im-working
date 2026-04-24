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

// ---- DOM integration (impure) ----

export const ALL_SCENES = [
  '열일하는중.html',
  'busy/trader.html', 'busy/ppt.html', 'busy/email.html',
  'busy/calendar.html', 'busy/design.html', 'busy/messenger.html',
  'busy/issuetracker.html', 'busy/crypto.html', 'busy/devops.html',
  'busy/videoedit.html', 'busy/cad.html',
  'busy/legal.html', 'busy/medical.html', 'busy/daw.html',
  'busy/3dmodel.html', 'busy/notebook.html', 'busy/atc.html',
  'busy/soc.html', 'busy/translator.html', 'busy/erp.html',
  'busy/wms.html', 'busy/latex.html', 'busy/hts.html',
];

function resolveSceneUrl(path) {
  const inBusy = location.pathname.includes('/busy/');
  return (inBusy ? '../' : './') + path;
}

let timer = null;
let channel = null;
let isLeader = false;

function navigateTo(path) {
  const url = resolveSceneUrl(path);
  location.replace(url);
}

function scheduleFromState(state) {
  if (timer) clearTimeout(timer);
  const wait = Math.max(0, state.nextAt - Date.now());
  timer = setTimeout(() => {
    const result = advance(state);
    if (!result) return;
    saveState(result.state);
    navigateTo(result.nextPath);
  }, wait);
}

export function mount(settings) {
  // Multi-tab guard — only leader rotates
  try {
    channel = new BroadcastChannel('busy');
    let sawOther = false;
    channel.addEventListener('message', (e) => {
      if (e.data?.type === 'hello') sawOther = true;
    });
    channel.postMessage({ type: 'hello', ts: Date.now() });
    // Wait 200ms then decide
    setTimeout(() => {
      isLeader = !sawOther;
      if (isLeader) bootRotation(settings);
    }, 200);
  } catch {
    // No BroadcastChannel — assume leader
    isLeader = true;
    bootRotation(settings);
  }
}

function bootRotation(settings) {
  const state = loadState();
  if (!state || !state.enabled) return;
  scheduleFromState(state);
}

/** Called by start.mjs when user clicks "시작". */
export function beginRotation(settings) {
  const order = buildOrder(ALL_SCENES, settings.rotation.blacklist);
  const state = {
    enabled: true,
    order,
    cursor: 0,
    baseSec: settings.rotation.baseSec,
    jitterPct: settings.rotation.jitterPct,
    blacklist: settings.rotation.blacklist,
    nextAt: Date.now() + settings.rotation.baseSec * 1000,
    pausedUntil: null,
  };
  saveState(state);
  scheduleFromState(state);
}

export function stopRotation() {
  if (timer) clearTimeout(timer);
  const state = loadState();
  if (state) { state.enabled = false; saveState(state); }
}

export function panic(settings) {
  if (timer) clearTimeout(timer);
  const state = loadState() || {};
  state.pausedUntil = Date.now() + 9_999_000;
  saveState(state);
  navigateTo(settings.panicScene);
}

export function resumePanic() {
  const state = loadState();
  if (!state) return;
  state.pausedUntil = null;
  saveState(state);
  if (state.enabled) scheduleFromState(state);
}
