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
  // page 1 scenes
  'busy/trader.html', 'busy/ppt.html', 'busy/email.html',
  'busy/calendar.html', 'busy/design.html', 'busy/messenger.html',
  'busy/issuetracker.html', 'busy/crypto.html', 'busy/devops.html',
  'busy/videoedit.html', 'busy/cad.html',
  'busy/legal.html', 'busy/medical.html', 'busy/daw.html',
  'busy/3dmodel.html', 'busy/notebook.html', 'busy/atc.html',
  'busy/soc.html', 'busy/translator.html', 'busy/erp.html',
  'busy/wms.html', 'busy/latex.html', 'busy/hts.html',
  // page 2 — first 6
  'busy/crm.html', 'busy/bi.html', 'busy/gis.html',
  'busy/photo.html', 'busy/zoom.html', 'busy/dba.html',
  // page 2 — additional 18
  'busy/outlook.html', 'busy/sheets.html', 'busy/teams.html', 'busy/hris.html',
  'busy/vscode.html', 'busy/postman.html', 'busy/grafana.html', 'busy/kibana.html',
  'busy/bloomberg.html', 'busy/portfolio.html', 'busy/audit.html',
  'busy/whiteboard.html', 'busy/afterfx.html', 'busy/obs.html',
  'busy/aws.html', 'busy/splunk.html',
  'busy/matlab.html',
  'busy/hometax.html',
];

// Role-based scene groupings — used when settings.rotation.role is set.
// Each role represents a coherent "one person's job" so the rotation looks
// believable across scenes (vs. ATC + DAW + legal review absurdity).
export const ROLE_GROUPS = {
  office: [
    'busy/email.html', 'busy/calendar.html', 'busy/messenger.html', 'busy/erp.html', 'busy/ppt.html',
    'busy/crm.html', 'busy/bi.html', 'busy/zoom.html',
    'busy/outlook.html', 'busy/sheets.html', 'busy/teams.html', 'busy/hris.html',
  ],
  dev: [
    '열일하는중.html', 'busy/issuetracker.html', 'busy/messenger.html', 'busy/devops.html', 'busy/notebook.html',
    'busy/dba.html',
    'busy/vscode.html', 'busy/postman.html', 'busy/grafana.html', 'busy/kibana.html',
  ],
  finance: [
    'busy/trader.html', 'busy/hts.html', 'busy/crypto.html', 'busy/email.html', 'busy/bi.html',
    'busy/bloomberg.html', 'busy/portfolio.html', 'busy/audit.html',
  ],
  creative: [
    'busy/design.html', 'busy/ppt.html', 'busy/videoedit.html', 'busy/daw.html', 'busy/3dmodel.html',
    'busy/photo.html',
    'busy/whiteboard.html', 'busy/afterfx.html', 'busy/obs.html',
  ],
  research: [
    'busy/notebook.html', 'busy/latex.html', 'busy/translator.html', 'busy/dba.html',
    'busy/matlab.html',
  ],
  ops: [
    'busy/atc.html', 'busy/soc.html', 'busy/wms.html', 'busy/hts.html', 'busy/gis.html',
    'busy/aws.html', 'busy/splunk.html', 'busy/grafana.html', 'busy/kibana.html',
  ],
  pro: [
    'busy/medical.html', 'busy/legal.html',
    'busy/hometax.html',
  ],
  mixed: null, // null = use ALL_SCENES (광인 모드)
};

export const ROLE_LABELS = {
  office: '🧑‍💼 사무직',
  dev: '👨‍💻 개발자',
  finance: '💰 금융',
  creative: '🎨 창작',
  research: '🔬 연구',
  ops: '🛡️ 관제',
  pro: '🏥 전문직',
  mixed: '🎲 혼합 (광인)',
};

/** Resolve which scene set to rotate through given a role + blacklist. */
export function resolveSceneSet(role, blacklist = []) {
  const base = (role && ROLE_GROUPS[role]) || ALL_SCENES;
  return base.filter((s) => !blacklist.includes(s));
}

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
  const sceneSet = resolveSceneSet(settings.rotation.role, settings.rotation.blacklist);
  const order = buildOrder(sceneSet, []);
  const state = {
    enabled: true,
    order,
    cursor: 0,
    role: settings.rotation.role,
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

/** Tour mode — fast cycle through one role's scenes. Different from
 *  normal rotation in that interval is short (default 6s) and there's
 *  a `tour: true` flag so Esc cleanly exits to hub. */
export function beginTour(role, intervalSec = 6) {
  if (timer) clearTimeout(timer);
  const sceneSet = resolveSceneSet(role, []);
  if (!sceneSet.length) return false;
  const order = buildOrder(sceneSet, []);
  const state = {
    enabled: true,
    tour: true,
    role,
    order,
    cursor: 0,
    baseSec: intervalSec,
    jitterPct: 0.15,
    blacklist: [],
    nextAt: Date.now() + intervalSec * 1000,
    pausedUntil: null,
  };
  saveState(state);
  navigateTo(order[0]);
  return true;
}

/** Returns true if the active rotation is a tour. */
export function isTouring() {
  const s = loadState();
  return !!(s && s.tour && s.enabled);
}

/** End the tour and clear rotation state. Caller is responsible for
 *  navigating back to hub. */
export function stopTour() {
  if (timer) clearTimeout(timer);
  clearState();
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
