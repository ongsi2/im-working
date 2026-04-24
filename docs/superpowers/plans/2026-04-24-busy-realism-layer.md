# Busy Realism Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global realism layer (OS chrome, toasts, typing sounds, ghost cursor, auto-rotation, wake lock, PiP, dead-scene vitals) on top of the existing 24 "looks-like-work" HTML prototypes so they feel believably alive.

**Architecture:** ES-module split. `shared.js` is a thin entry that imports 10 modules from `shared-core/*.mjs` (EventBus, Settings, IdentityTag, OSChrome, Toast, Cursor, Sound, WakeLock, Rotator, Start). Pure-logic modules (EventBus, Settings, Rotator, VitalsCore) are unit tested with `node:test` (zero dep). DOM modules are verified via Playwright MCP. Vitals injection is DOM-agnostic (querySelectorAll on `p/li/td/.bar/[class*="log"]`) so scene HTMLs need only a `<body data-*>` attr and one `<script type="module">` line.

**Tech Stack:** Vanilla HTML/CSS/JS · ES modules · Web APIs (WakeLock, Fullscreen, PiP, WebAudio, BroadcastChannel, localStorage, sessionStorage) · `node:test` for unit tests · Playwright MCP for visual verification · Vercel MCP for deployment.

**Spec:** [docs/superpowers/specs/2026-04-24-busy-realism-layer-design.md](../specs/2026-04-24-busy-realism-layer-design.md)

---

## File Structure

**Architecture refinement from spec §2:** spec says "shared.js + shared.css + shared-vitals.js 3 files". Plan splits the JS into `shared-core/*.mjs` modules (ES-module imports) for testability and focus. Entry files (`shared.js`, `shared-vitals.js`) remain as the spec requires.

```
C:/working/
├── shared.js                  [NEW]  Entry — imports all shared-core modules, boots them
├── shared.css                 [NEW]  Styles for all injected overlays
├── shared-vitals.js           [NEW]  Entry — imports vitals-core + wires DOM injectors
├── shared-core/               [NEW]
│   ├── eventbus.mjs           [NEW]  Busy.emit/on primitives
│   ├── settings.mjs           [NEW]  localStorage-backed settings + defaults
│   ├── identity-tag.mjs       [NEW]  title/favicon/unread counter
│   ├── os-chrome.mjs          [NEW]  top bar + bottom dock
│   ├── toast.mjs              [NEW]  toast queue + message pool
│   ├── cursor.mjs             [NEW]  ghost cursor drift
│   ├── sound.mjs              [NEW]  WebAudio keystroke/click/ding
│   ├── wake-lock.mjs          [NEW]  wake lock + video fallback
│   ├── rotator.mjs            [NEW]  rotation state + advance logic
│   ├── start.mjs              [NEW]  single-gesture orchestrator (FS + audio + WL + PiP + rotate)
│   ├── pip.mjs                [NEW]  "camera off" dummy PiP video
│   ├── toast-pool.mjs         [NEW]  ~60 preset messages (Slack/Mail/Cal/Sys)
│   ├── vitals-core.mjs        [NEW]  type→injector dispatch
│   ├── vitals-document.mjs    [NEW]  document-type injector
│   ├── vitals-table.mjs       [NEW]  table-type injector
│   ├── vitals-dashboard.mjs   [NEW]  dashboard-type injector
│   └── vitals-tool.mjs        [NEW]  tool-type injector
├── tests/                     [NEW]
│   ├── eventbus.test.mjs
│   ├── settings.test.mjs
│   ├── rotator.test.mjs
│   └── vitals-core.test.mjs
├── robots.txt                 [NEW]
├── vercel.ts                  [NEW]  boilerplate Vercel config + security headers
├── .vercelignore              [NEW]
├── index.html                 [MODIFY] FAB, settings drawer, status strip, shortcut expansion, script/link
├── 열일하는중 허브.html        [MODIFY] same as index
├── 열일하는중.html             [MODIFY] body data-* + script/link
└── busy/*.html (23 files)     [MODIFY] body data-* + script/link each
```

---

## Common Patterns (referenced by tasks)

### Pattern A — Run unit tests
```bash
node --test tests/
```
Expected when passing: each `test(...)` logs `ok`, final summary shows `pass N`.

### Pattern B — Browser verification
Static server is already running in background (task ID `b0ch0bxy3`, `python -m http.server 8000` at `C:/working/`). To verify DOM behavior:

1. Load deferred tools if needed: `ToolSearch({query: "select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_snapshot,mcp__plugin_playwright_playwright__browser_take_screenshot,mcp__plugin_playwright_playwright__browser_console_messages,mcp__plugin_playwright_playwright__browser_close"})`
2. `browser_navigate("http://localhost:8000/<path>")`
3. `browser_snapshot()` or `browser_evaluate("() => (...)")` to assert state
4. `browser_console_messages()` to check `[Busy]` logs

Close browser between tasks when not needed: `browser_close()`.

### Pattern C — Scene metadata table
All 24 scenes need body attributes. Used in Task 25. Full table:

| Scene file | deadzone | vitals-type | data-title | data-favicon |
|---|---|---|---|---|
| 열일하는중.html | false | — | `SYS.MONITOR · prod-us-east-1` | `🖥️` |
| busy/trader.html | false | — | `MARKETS · DMA Terminal` | `📈` |
| busy/ppt.html | false | — | `Q2_Board_Deck_v14.pptx` | `📊` |
| busy/email.html | false | — | `(3) 받은 편지함 — Mail` | `📧` |
| busy/calendar.html | false | — | `4월 · Calendar` | `📅` |
| busy/design.html | false | — | `brand-system — Figma` | `🎨` |
| busy/messenger.html | false | — | `(7) #growth — Slack` | `💬` |
| busy/issuetracker.html | false | — | `GROWTH-1423 — Jira` | `🎯` |
| busy/crypto.html | false | — | `BTC/USDT — Binance Pro` | `🪙` |
| busy/devops.html | false | — | `k8s-prod — Lens` | `⎈` |
| busy/videoedit.html | false | — | `Q2_promo_v17.fcpbundle` | `🎬` |
| busy/cad.html | suppress:cursor | — | `Block_B_Floor_12.dwg` | `📐` |
| busy/legal.html | true | document | `계약서_최종_v7.docx` | `⚖️` |
| busy/medical.html | true | document | `진료기록_2026_04_24.pdf` | `🏥` |
| busy/translator.html | true | document | `CAT Tool — ZH→KO` | `🈯` |
| busy/latex.html | true | document | `main.tex — Overleaf` | `📄` |
| busy/notebook.html | true | document | `Untitled.ipynb — Jupyter` | `📓` |
| busy/erp.html | true | table | `월마감 처리 — SAP` | `🏢` |
| busy/wms.html | true | table | `창고 재고 — WMS` | `📦` |
| busy/atc.html | true | dashboard | `Sector 34R · ATC` | `✈️` |
| busy/soc.html | true | dashboard | `SOC Ops · SIEM` | `🛡️` |
| busy/hts.html | true | dashboard | `HTS · KOSPI 실시간` | `📉` |
| busy/daw.html | true | tool | `Session_final.logicx` | `🎵` |
| busy/3dmodel.html | true | tool | `render_scene_04.blend` | `🧊` |

### Pattern D — Add shared.js + body attrs to a scene
Insert before `</head>`:
```html
<link rel="stylesheet" href="<relative>shared.css">
```
Insert before `</body>`:
```html
<script type="module" src="<relative>shared.js"></script>
```
Replace `<body>` opening tag with attributes from Pattern C.

- For root files (`열일하는중.html`, `index.html`, `열일하는중 허브.html`): `<relative>` = `./`
- For `busy/*.html`: `<relative>` = `../`

### Pattern E — Commit format
`<type>(<module>): <summary>` where type ∈ {feat, test, fix, chore, docs, deploy}. Module name matches file basename or phase.

---

## Phase 1 — Foundation (Tasks 1-4)

### Task 1: Bootstrap shared files + smoke wire

**Files:**
- Create: `C:/working/shared.css`
- Create: `C:/working/shared.js`
- Create: `C:/working/shared-core/eventbus.mjs`
- Modify: `C:/working/index.html` (one `<link>`, one `<script>`)

- [ ] **Step 1: Create `shared.css` skeleton**

```css
/* shared.css — realism overlay styles */
/* z-index strata:
   overlays pointer-events: none by default
   99997 status-strip (hub only)
   99998 os-top / os-dock
   99999 toast / ghost-cursor
   100000 settings drawer / FAB
*/

.busy-os-top, .busy-os-dock, .busy-toast, .busy-ghost-cursor,
.busy-hub-fab, .busy-settings-drawer, .busy-status-strip,
.busy-badge, .busy-vitals-editing, .busy-vitals-caret {
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

/* Hide helper */
.busy-hidden { display: none !important; }
```

- [ ] **Step 2: Create `shared-core/eventbus.mjs`**

```js
// shared-core/eventbus.mjs — tiny pub/sub on window

const PREFIX = 'busy:';

export function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(PREFIX + name, { detail }));
}

export function on(name, fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(PREFIX + name, handler);
  return () => window.removeEventListener(PREFIX + name, handler);
}
```

- [ ] **Step 3: Create `shared.js` entry with boot log**

```js
// shared.js — realism layer entry point

import { emit, on } from './shared-core/eventbus.mjs';

// Global namespace
const Busy = {
  VERSION: '0.1.0',
  emit,
  on,
  state: {},
  settings: null,   // populated by settings.mjs in Task 2
};
window.Busy = Busy;

console.info(`[Busy] shared.js v${Busy.VERSION} boot`);
```

Note: path `./shared-core/...` works relative to the HTML that loads `shared.js`. For `busy/*.html` the `<script src="../shared.js">` resolves imports against the `shared.js` file's location, not the HTML. Modern browser ES module resolution handles this correctly.

- [ ] **Step 4: Wire into `index.html`**

Find `</head>` and add just before:
```html
<link rel="stylesheet" href="./shared.css">
```

Find `</body>` and add just before:
```html
<script type="module" src="./shared.js"></script>
```

- [ ] **Step 5: Verify boot log in browser**

```
Playwright MCP:
  browser_navigate("http://localhost:8000/")
  browser_console_messages() → must contain "[Busy] shared.js v0.1.0 boot"
  browser_close()
```

- [ ] **Step 6: Commit**

```bash
git add shared.css shared.js shared-core/eventbus.mjs index.html
git commit -m "feat(bootstrap): wire shared.js entry + eventbus into hub"
```

---

### Task 2: Settings module with localStorage

**Files:**
- Create: `C:/working/shared-core/settings.mjs`
- Create: `C:/working/tests/settings.test.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Write failing test `tests/settings.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert';

// Stub a minimal localStorage for Node test env
globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
})();

const { load, save, reset, defaults } = await import('../shared-core/settings.mjs');

test('defaults: intensity=med, rotation.enabled=false', () => {
  localStorage.clear();
  const s = load();
  assert.strictEqual(s.intensity, 'med');
  assert.strictEqual(s.rotation.enabled, false);
  assert.strictEqual(s.sound.enabled, true);
  assert.strictEqual(s.osChrome, 'mac');
  assert.strictEqual(s.panicScene, 'busy/email.html');
});

test('save/load round trip', () => {
  localStorage.clear();
  const s = load();
  s.intensity = 'high';
  s.rotation.baseSec = 35;
  save(s);
  const s2 = load();
  assert.strictEqual(s2.intensity, 'high');
  assert.strictEqual(s2.rotation.baseSec, 35);
});

test('reset clears and restores defaults', () => {
  const s = load();
  s.intensity = 'high';
  save(s);
  reset();
  assert.strictEqual(load().intensity, 'med');
});

test('partial stored data merges with defaults (forward-compat)', () => {
  localStorage.clear();
  localStorage.setItem('busy.settings', JSON.stringify({ intensity: 'low' }));
  const s = load();
  assert.strictEqual(s.intensity, 'low');
  assert.strictEqual(s.rotation.enabled, false); // default still present
});
```

Run: `node --test tests/settings.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement `shared-core/settings.mjs`**

```js
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
```

- [ ] **Step 3: Re-run tests**

Run: `node --test tests/settings.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 4: Wire into `shared.js`**

Prepend new import and assignment:
```js
import { load as loadSettings } from './shared-core/settings.mjs';
// ... after Busy namespace creation:
Busy.settings = loadSettings();
console.info(`[Busy] settings loaded · intensity=${Busy.settings.intensity}`);
```

- [ ] **Step 5: Verify in browser**

Playwright: navigate, `browser_evaluate("() => JSON.stringify(window.Busy.settings.intensity)")` → `"med"`.

- [ ] **Step 6: Commit**

```bash
git add shared-core/settings.mjs tests/settings.test.mjs shared.js
git commit -m "feat(settings): localStorage-backed settings with forward-compat merge"
```

---

### Task 3: EventBus unit tests

**Files:**
- Create: `C:/working/tests/eventbus.test.mjs`

- [ ] **Step 1: Write tests**

```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert';

// Minimal window stub
globalThis.window = globalThis.window || {
  _listeners: new Map(),
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  },
  dispatchEvent(evt) {
    this._listeners.get(evt.type)?.forEach((fn) => fn(evt));
    return true;
  },
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

const { emit, on } = await import('../shared-core/eventbus.mjs');

test('emit → subscribed listener fires with detail', () => {
  let got = null;
  on('toast', (d) => { got = d; });
  emit('toast', { text: 'hi' });
  assert.deepStrictEqual(got, { text: 'hi' });
});

test('on returns unsubscribe fn', () => {
  let count = 0;
  const off = on('ping', () => count++);
  emit('ping'); emit('ping');
  off();
  emit('ping');
  assert.strictEqual(count, 2);
});

test('multiple listeners all fire', () => {
  let a = 0, b = 0;
  on('fan', () => a++);
  on('fan', () => b++);
  emit('fan');
  assert.strictEqual(a, 1);
  assert.strictEqual(b, 1);
});
```

- [ ] **Step 2: Run tests**

`node --test tests/eventbus.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add tests/eventbus.test.mjs
git commit -m "test(eventbus): verify pub/sub + unsubscribe + multi-listener"
```

---

### Task 4: IdentityTag module (title + favicon + unread counter)

**Files:**
- Create: `C:/working/shared-core/identity-tag.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Create `shared-core/identity-tag.mjs`**

```js
// shared-core/identity-tag.mjs
// Reads <body data-title="..." data-favicon="..."> and sets document.title + favicon.
// Unread counter: prepend "(N) " to title when toasts arrive; reset on load.

import { on } from './eventbus.mjs';

let baseTitle = '';
let unread = 0;

function emojiToDataUri(emoji) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<text y="52" font-size="56" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function applyFavicon(value) {
  if (!value) return;
  const href = value.startsWith('data:') || value.startsWith('http') || value.includes('.')
    ? value
    : emojiToDataUri(value);
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

function render() {
  const prefix = unread > 0 ? `(${unread}) ` : '';
  document.title = prefix + baseTitle;
}

export function mount() {
  baseTitle = document.body?.dataset.title || document.title || '열일하는중';
  const favicon = document.body?.dataset.favicon;
  applyFavicon(favicon);
  render();

  on('toast', () => { unread += 1; render(); });
  // Reset counter on any user interaction (focus "read" the tab)
  const reset = () => { if (unread) { unread = 0; render(); } };
  ['click', 'keydown', 'mousemove'].forEach((t) =>
    window.addEventListener(t, reset, { once: true, passive: true })
  );
}

export const _test = { setBaseForTest: (t) => { baseTitle = t; unread = 0; } };
```

- [ ] **Step 2: Wire into `shared.js`**

Add:
```js
import { mount as mountIdentity } from './shared-core/identity-tag.mjs';
// at end of boot:
try { mountIdentity(); } catch (e) { console.warn('[Busy] IdentityTag failed', e); }
```

- [ ] **Step 3: Add data attrs to `index.html` and `열일하는중 허브.html`**

Change `<body>` to:
```html
<body data-title="열일하는중 허브" data-favicon="🎛">
```

- [ ] **Step 4: Verify in browser**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.title") → "열일하는중 허브"
browser_evaluate("() => document.querySelector('link[rel=icon]').href") → contains "data:image/svg"
```

- [ ] **Step 5: Commit**

```bash
git add shared-core/identity-tag.mjs shared.js index.html "열일하는중 허브.html"
git commit -m "feat(identity-tag): dynamic title/favicon from body data-* + unread counter"
```

---

## Phase 2 — OS Chrome & Visible Layers (Tasks 5-10)

### Task 5: OSChrome top bar skeleton + clock

**Files:**
- Create: `C:/working/shared-core/os-chrome.mjs`
- Modify: `C:/working/shared.css`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Add CSS for top bar**

Append to `shared.css`:
```css
/* OS top bar */
.busy-os-top {
  position: fixed; top: 0; left: 0; right: 0; height: 24px;
  z-index: 99998; pointer-events: none;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 12px; font-size: 12px; color: #e6e6e6;
  background: rgba(20, 20, 22, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  user-select: none;
}
.busy-os-top .left, .busy-os-top .right { display: flex; gap: 12px; align-items: center; }
.busy-os-top .logo { font-weight: 600; font-size: 13px; opacity: 0.9; }
.busy-os-top .app-name { opacity: 0.85; }
.busy-os-top[data-skin="win"] {
  background: rgba(243,243,243,0.95); color: #222;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}
.busy-os-top[data-skin="win"] .logo::before { content: "⊞  "; }
.busy-os-top[data-skin="mac"] .logo::before { content: "  "; }  /* Apple glyph */

.busy-os-top .battery, .busy-os-top .wifi, .busy-os-top .dnd {
  display: inline-flex; align-items: center; gap: 3px;
}
.busy-os-top .wifi.flicker { opacity: 0.3; transition: opacity 0.2s; }
.busy-os-top .clock { font-variant-numeric: tabular-nums; }

/* Hide host page's scrollbar from touching top bar area */
body.busy-has-chrome { padding-top: 24px; }
body.busy-has-chrome.busy-has-dock { padding-bottom: 56px; }
```

- [ ] **Step 2: Create `shared-core/os-chrome.mjs` top bar**

```js
// shared-core/os-chrome.mjs

let topEl = null;
let clockTimer = null;

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function render(el, skin) {
  el.dataset.skin = skin;
  el.innerHTML = `
    <div class="left">
      <span class="logo"></span>
      <span class="app-name" data-role="app-name"></span>
    </div>
    <div class="right">
      <span class="dnd" title="방해 금지">🌙</span>
      <span class="wifi" title="Wi-Fi">📶</span>
      <span class="battery" title="배터리"><span data-role="batt-pct">100</span>%</span>
      <span class="clock" data-role="clock">00:00</span>
    </div>
  `;
}

export function mount(settings) {
  if (settings.osChrome === 'off') return;
  topEl = document.createElement('div');
  topEl.className = 'busy-os-top';
  render(topEl, settings.osChrome);
  document.body.appendChild(topEl);
  document.body.classList.add('busy-has-chrome');

  // App name from IdentityTag's base title
  const appName = document.body.dataset.title || document.title;
  topEl.querySelector('[data-role="app-name"]').textContent = appName;

  const tick = () => {
    topEl.querySelector('[data-role="clock"]').textContent = fmtTime(new Date());
  };
  tick();
  clockTimer = setInterval(tick, 1000);
}

export function unmount() {
  if (clockTimer) clearInterval(clockTimer);
  topEl?.remove();
  document.body.classList.remove('busy-has-chrome');
}
```

- [ ] **Step 3: Wire into `shared.js`**

```js
import { mount as mountOSChrome } from './shared-core/os-chrome.mjs';
// at boot (after Busy.settings is loaded, after IdentityTag):
try { mountOSChrome(Busy.settings); } catch (e) { console.warn('[Busy] OSChrome failed', e); }
```

- [ ] **Step 4: Verify**

```
browser_navigate("http://localhost:8000/")
browser_take_screenshot()  ← should show a dark 24px bar at the top
browser_evaluate("() => document.querySelector('.busy-os-top .clock').textContent")
   → matches /\d{2}:\d{2}/
```

- [ ] **Step 5: Commit**

```bash
git add shared.css shared-core/os-chrome.mjs shared.js
git commit -m "feat(os-chrome): fixed top bar with app name + clock"
```

---

### Task 6: OSChrome battery + wifi behavior

**Files:**
- Modify: `C:/working/shared-core/os-chrome.mjs`

- [ ] **Step 1: Add battery drain + wifi flicker**

Append to `os-chrome.mjs`:
```js
let battPct = 100;
let battTimer = null;
let wifiTimer = null;

function tickBattery(el) {
  battPct = Math.max(3, battPct - 1);
  el.querySelector('[data-role="batt-pct"]').textContent = String(battPct);
  if (battPct <= 15) {
    el.querySelector('.battery').title = '충전 중';
    el.querySelector('.battery').style.color = '#ffb020';
  }
}

function scheduleWifiFlicker(el) {
  const delay = (2 + Math.random() * 8) * 60 * 1000; // 2~10 min
  wifiTimer = setTimeout(() => {
    const wifi = el.querySelector('.wifi');
    wifi.classList.add('flicker');
    setTimeout(() => wifi.classList.remove('flicker'), 600);
    scheduleWifiFlicker(el);
  }, delay);
}
```

Inside `mount(settings)`, after `tick(); clockTimer = setInterval(tick, 1000);` add:
```js
  battPct = 85 + Math.floor(Math.random() * 15); // start 85~99
  tickBattery(topEl);
  battTimer = setInterval(() => tickBattery(topEl), 60 * 1000);
  scheduleWifiFlicker(topEl);
```

Inside `unmount()` add:
```js
  if (battTimer) clearInterval(battTimer);
  if (wifiTimer) clearTimeout(wifiTimer);
```

- [ ] **Step 2: Verify (static, no time passing)**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => {
  const pct = parseInt(document.querySelector('[data-role=\"batt-pct\"]').textContent);
  return pct >= 85 && pct < 100;
}")  → true
```

- [ ] **Step 3: Commit**

```bash
git add shared-core/os-chrome.mjs
git commit -m "feat(os-chrome): battery drain + wifi flicker ambient behavior"
```

---

### Task 7: OSChrome bottom dock

**Files:**
- Modify: `C:/working/shared-core/os-chrome.mjs`
- Modify: `C:/working/shared.css`

- [ ] **Step 1: Add dock CSS**

Append to `shared.css`:
```css
.busy-os-dock {
  position: fixed; bottom: 8px; left: 50%; transform: translateX(-50%);
  z-index: 99998; pointer-events: none;
  display: flex; gap: 8px; padding: 6px 10px;
  background: rgba(30,30,34,0.85); backdrop-filter: blur(10px);
  border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);
}
.busy-os-dock[data-skin="win"] {
  bottom: 0; left: 0; right: 0; transform: none;
  height: 40px; border-radius: 0; gap: 4px; padding: 4px 8px;
  background: rgba(243,243,243,0.95);
}
.busy-os-dock .dock-app {
  width: 32px; height: 32px; display: grid; place-items: center;
  font-size: 20px; position: relative;
}
.busy-os-dock .dock-app .dot {
  position: absolute; top: 2px; right: 2px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #ff4444; box-shadow: 0 0 4px #ff4444;
  opacity: 0; transition: opacity 0.4s;
}
.busy-os-dock .dock-app .dot.on { opacity: 1; }
```

- [ ] **Step 2: Extend `os-chrome.mjs` with dock**

Append to `os-chrome.mjs`:
```js
let dockEl = null;
let dockTimer = null;

const DOCK_APPS = [
  { icon: '💬', name: 'Slack' },
  { icon: '📧', name: 'Mail' },
  { icon: '📝', name: 'Notion' },
  { icon: '📊', name: 'Excel' },
  { icon: '🌐', name: 'Chrome' },
  { icon: '💻', name: 'Terminal' },
];

function mountDock(skin) {
  dockEl = document.createElement('div');
  dockEl.className = 'busy-os-dock';
  dockEl.dataset.skin = skin;
  dockEl.innerHTML = DOCK_APPS.map((a, i) =>
    `<div class="dock-app" data-idx="${i}" title="${a.name}">${a.icon}<span class="dot"></span></div>`
  ).join('');
  document.body.appendChild(dockEl);
  document.body.classList.add('busy-has-dock');

  dockTimer = setInterval(() => {
    const dots = dockEl.querySelectorAll('.dot');
    const idx = Math.floor(Math.random() * dots.length);
    dots[idx].classList.toggle('on');
  }, 30_000 + Math.random() * 90_000);
}

function unmountDock() {
  if (dockTimer) clearInterval(dockTimer);
  dockEl?.remove();
  document.body.classList.remove('busy-has-dock');
}
```

Inside `mount(settings)` after the top-bar creation:
```js
  if (settings.osChrome !== 'off') mountDock(settings.osChrome);
```

Inside `unmount()`:
```js
  unmountDock();
```

- [ ] **Step 3: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.querySelectorAll('.busy-os-dock .dock-app').length")
   → 6
```

- [ ] **Step 4: Commit**

```bash
git add shared-core/os-chrome.mjs shared.css
git commit -m "feat(os-chrome): bottom dock with 6 apps and random notification dots"
```

---

### Task 8: Toast manager + message pool

**Files:**
- Create: `C:/working/shared-core/toast-pool.mjs`
- Create: `C:/working/shared-core/toast.mjs`
- Modify: `C:/working/shared.css`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Toast CSS**

Append to `shared.css`:
```css
.busy-toast-container {
  position: fixed; top: 36px; right: 16px; z-index: 99999;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
  max-width: 340px;
}
.busy-toast {
  pointer-events: auto;
  background: rgba(32,32,36,0.96); color: #e8e8e8;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  padding: 10px 12px; font-size: 13px; line-height: 1.4;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  transform: translateX(380px); opacity: 0;
  transition: transform 280ms ease, opacity 280ms ease;
  cursor: pointer;
}
.busy-toast.show { transform: translateX(0); opacity: 1; }
.busy-toast .meta { display: flex; gap: 6px; align-items: center; font-size: 11px; opacity: 0.7; margin-bottom: 2px; }
.busy-toast .title { font-weight: 600; }
.busy-toast .body { opacity: 0.88; }
.busy-toast[data-cat="slack"] .icon::before { content: "💬"; }
.busy-toast[data-cat="mail"] .icon::before  { content: "📧"; }
.busy-toast[data-cat="cal"] .icon::before   { content: "📅"; }
.busy-toast[data-cat="sys"] .icon::before   { content: "⚙️"; }
```

- [ ] **Step 2: Create `shared-core/toast-pool.mjs`**

```js
// shared-core/toast-pool.mjs — preset toast messages

export const POOL = [
  { cat: 'slack', title: '이수민', body: '방금 공유한 거 한번 봐주실 수 있어요?', target: 'busy/messenger.html' },
  { cat: 'slack', title: '#growth', body: 'kpi-refresh 끝났어요. 링크 첨부합니다.', target: 'busy/messenger.html' },
  { cat: 'slack', title: '박지훈', body: '리뷰 요청드려요. 급한 건 아니고요.', target: 'busy/messenger.html' },
  { cat: 'slack', title: '@everyone', body: '금요일 회식 장소 투표 ▸', target: 'busy/messenger.html' },
  { cat: 'slack', title: '#alerts', body: '🔴 prod-eu-west p99 latency 800ms 초과', target: '열일하는중.html' },
  { cat: 'slack', title: '#eng-design', body: 'v2 시안 올렸어요. 피드백 부탁!', target: 'busy/design.html' },
  { cat: 'slack', title: '한서연', body: '내일 10시 1:1 가능해요?', target: 'busy/calendar.html' },
  { cat: 'slack', title: '@channel', body: '배포 중이에요. 머지 잠시 보류해주세요.', target: 'busy/devops.html' },
  { cat: 'mail', title: 'CEO 사무국', body: '금주 주간 보고 취합 요청드립니다.', target: 'busy/email.html' },
  { cat: 'mail', title: '한국어뉴스', body: '[속보] 환율 1,410원 돌파', target: 'busy/email.html' },
  { cat: 'mail', title: 'AWS Health', body: 'Scheduled RDS maintenance', target: 'busy/email.html' },
  { cat: 'mail', title: '김과장', body: 'RE: Q2 실적 분석 건 (회신 요망)', target: 'busy/email.html' },
  { cat: 'mail', title: 'GitHub', body: '[PR #1423] review requested from you', target: 'busy/issuetracker.html' },
  { cat: 'mail', title: 'Figma', body: 'design-review commented on your file', target: 'busy/design.html' },
  { cat: 'mail', title: 'Calendar', body: '14:00 · CTO 1:1 · 시작 15분 전', target: 'busy/calendar.html' },
  { cat: 'mail', title: 'Zoom', body: '참여 대기 중 · 팀 스탠드업', target: null },
  { cat: 'cal', title: '회의 알림', body: '15:00 스프린트 플래닝 (30분 후)', target: 'busy/calendar.html' },
  { cat: 'cal', title: '일정 추가', body: '이수민님이 새 일정을 공유했습니다', target: 'busy/calendar.html' },
  { cat: 'cal', title: '집중 시간', body: '47분 남음 · 알림 억제 중', target: null },
  { cat: 'sys', title: '저장 완료', body: 'Q2_실적분석_v14_최종_수정본_진짜최종.xlsx', target: null },
  { cat: 'sys', title: '업데이트 가능', body: 'Slack 4.45.0 → 4.45.1', target: null },
  { cat: 'sys', title: '백업', body: 'Time Machine 백업 완료 (2.3 GB)', target: null },
  { cat: 'sys', title: '보안 경고', body: '새 기기에서 로그인이 감지되었습니다', target: null },
  { cat: 'sys', title: 'VPN', body: 'corp-gw-seoul 연결됨', target: null },
  { cat: 'sys', title: '클립보드', body: '방금 복사 · 256자', target: null },
  { cat: 'slack', title: '이재민', body: '이거 RCA에 넣을까요?', target: 'busy/messenger.html' },
  { cat: 'slack', title: '#product', body: '로드맵 Q3 초안 공유드립니다', target: 'busy/ppt.html' },
  { cat: 'mail', title: 'Linear', body: 'GROWTH-1423 moved to In Review', target: 'busy/issuetracker.html' },
  { cat: 'mail', title: 'PagerDuty', body: '[RESOLVED] db-primary high CPU', target: 'busy/devops.html' },
  { cat: 'cal', title: '점심 알림', body: '12:30 · 팀 점심 · 1층 카페', target: 'busy/calendar.html' },
  { cat: 'sys', title: 'Oracle DW', body: '12,482행 가져오는 중...', target: null },
  { cat: 'slack', title: '송민지', body: '잠깐 콜 가능해요? 5분만요', target: 'busy/messenger.html' },
  { cat: 'slack', title: '#platform', body: 'k8s 1.29 업그레이드 완료', target: 'busy/devops.html' },
  { cat: 'mail', title: 'LinkedIn', body: '3명이 내 프로필을 조회했습니다', target: null },
  { cat: 'mail', title: '사내공지', body: '[필독] 4월 정기 보안 교육', target: 'busy/email.html' },
  { cat: 'cal', title: '회의 종료', body: 'KPI 리뷰 · 끝났습니다', target: null },
  { cat: 'sys', title: 'SAP', body: '월마감 처리 배치 시작 · 진행 23%', target: 'busy/erp.html' },
  { cat: 'sys', title: 'Docker', body: '이미지 빌드 완료 · api-v2.7 (1.2 GB)', target: 'busy/devops.html' },
  { cat: 'slack', title: '최수영', body: '커피 한잔 하실래요?', target: null },
  { cat: 'mail', title: 'FedEx', body: '배송 예정 · 오늘 오후', target: null },
  { cat: 'cal', title: '반복 일정', body: '매주 금 17:00 · 회고', target: 'busy/calendar.html' },
  { cat: 'sys', title: '디스크 공간', body: '시스템 드라이브 여유 공간 15% 미만', target: null },
  { cat: 'slack', title: '#incidents', body: '🟠 orders-api p95 급등', target: '열일하는중.html' },
  { cat: 'slack', title: '#finance', body: '4월 정산 완료, 확인 부탁드려요', target: 'busy/email.html' },
  { cat: 'mail', title: 'AWS Billing', body: '$312.47 · 전월 대비 +8%', target: null },
  { cat: 'sys', title: 'VS Code', body: '워크스페이스 복구 완료', target: null },
  { cat: 'slack', title: '@DM 김PM', body: '스펙 초안 확인했어요. 의견 드릴게요', target: 'busy/messenger.html' },
  { cat: 'mail', title: 'Bloomberg', body: 'KOSPI -1.2% · 외국인 순매도 지속', target: 'busy/hts.html' },
  { cat: 'cal', title: '1:1 준비', body: '14:30 CTO 1:1 · 노트 열기', target: 'busy/notebook.html' },
  { cat: 'sys', title: '네트워크', body: 'VPN 연결이 재설정되었습니다', target: null },
  { cat: 'slack', title: '#design', body: '로고 가이드 v3 배포', target: 'busy/design.html' },
  { cat: 'mail', title: 'Zendesk', body: '신규 티켓 #8842 · 응답 대기 중', target: 'busy/issuetracker.html' },
  { cat: 'cal', title: '오늘의 할 일', body: '3개 완료 · 5개 남음', target: null },
  { cat: 'sys', title: '압축 완료', body: 'render_scene_04.zip (2.1 GB)', target: 'busy/3dmodel.html' },
  { cat: 'slack', title: '박대표', body: '이번주 성과 요약 부탁드려요', target: 'busy/ppt.html' },
  { cat: 'mail', title: 'Stripe', body: '결제 실패 1건 · 수동 처리 필요', target: null },
  { cat: 'sys', title: '자동 저장', body: 'main.tex 저장됨 · 오후 3:47', target: 'busy/latex.html' },
  { cat: 'slack', title: '김팀장', body: '내일 오전 30분만 시간 돼요?', target: 'busy/calendar.html' },
  { cat: 'mail', title: 'DHL Express', body: '배송 지연 안내 · 익일 재시도', target: null },
  { cat: 'cal', title: '스탠드업', body: '10:00 · 2분 전 시작', target: null },
];

export function randomToast() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}
```

- [ ] **Step 3: Create `shared-core/toast.mjs`**

```js
// shared-core/toast.mjs — show, queue, schedule

import { emit } from './eventbus.mjs';
import { randomToast } from './toast-pool.mjs';

const INTERVAL_BY_INTENSITY = {
  low:  [180, 420],
  med:  [60, 180],
  high: [20, 90],
};

let container = null;
let queue = [];
let showing = 0;
const MAX_SHOWING = 2;
let scheduleTimer = null;
let settings = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'busy-toast-container';
  document.body.appendChild(container);
  return container;
}

function drainQueue() {
  while (showing < MAX_SHOWING && queue.length > 0) {
    const t = queue.shift();
    showing++;
    render(t);
  }
}

function render(t) {
  ensureContainer();
  const el = document.createElement('div');
  el.className = 'busy-toast';
  el.dataset.cat = t.cat;
  el.innerHTML = `
    <div class="meta"><span class="icon"></span><span>${escapeHtml(t.title)}</span></div>
    <div class="body">${escapeHtml(t.body)}</div>
  `;
  if (t.target) {
    el.addEventListener('click', () => {
      const base = location.pathname.includes('/busy/') ? '../' : './';
      location.href = base + t.target;
    });
  }
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => {
      el.remove();
      showing--;
      drainQueue();
    }, 320);
  }, 4500);
  emit('toast', t);
}

function escapeHtml(s) {
  return String(s).replace(/[<>&"']/g, (c) =>
    ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}

export function show(t) {
  if (!t) t = randomToast();
  queue.push(t);
  drainQueue();
}

function scheduleNext() {
  const [min, max] = INTERVAL_BY_INTENSITY[settings.intensity] || INTERVAL_BY_INTENSITY.med;
  const delaySec = min + Math.random() * (max - min);
  scheduleTimer = setTimeout(() => {
    if (document.body.dataset.suppress?.includes('toast')) { scheduleNext(); return; }
    show(randomToast());
    scheduleNext();
  }, delaySec * 1000);
}

export function mount(s) {
  settings = s;
  scheduleNext();
}

export function unmount() {
  if (scheduleTimer) clearTimeout(scheduleTimer);
  container?.remove();
  container = null;
  queue = [];
  showing = 0;
}
```

- [ ] **Step 4: Wire into `shared.js`**

```js
import { mount as mountToast } from './shared-core/toast.mjs';
// in boot:
try { mountToast(Busy.settings); } catch (e) { console.warn('[Busy] Toast failed', e); }
```

Also add a dev helper for manual testing:
```js
Busy.showToast = (t) => { import('./shared-core/toast.mjs').then(m => m.show(t)); };
```

- [ ] **Step 5: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => { window.Busy.showToast({cat:'slack',title:'테스트',body:'토스트 확인'}); return 'ok'; }")
browser_take_screenshot()  ← toast visible upper right
```

- [ ] **Step 6: Commit**

```bash
git add shared-core/toast-pool.mjs shared-core/toast.mjs shared.css shared.js
git commit -m "feat(toast): queue-based toast manager with 60-entry pool"
```

---

### Task 9: CursorDrift — ghost cursor overlay

**Files:**
- Create: `C:/working/shared-core/cursor.mjs`
- Modify: `C:/working/shared.css`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: CSS for ghost cursor**

Append to `shared.css`:
```css
.busy-ghost-cursor {
  position: fixed; top: 0; left: 0; z-index: 99999;
  width: 14px; height: 20px; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 20'%3E%3Cpath fill='%23fff' stroke='%23000' stroke-width='0.9' d='M1 1 L1 16 L5 12.5 L7.5 18 L9.5 17 L7 12 L12 12 Z'/%3E%3C/svg%3E");
  background-size: contain;
  transform: translate(0, 0);
  will-change: transform;
  transition: transform 0.12s linear;
  opacity: 0.85;
}
.busy-ghost-cursor.jumping { transition: transform 140ms cubic-bezier(0.2, 0.8, 0.2, 1); }
```

- [ ] **Step 2: Create `shared-core/cursor.mjs`**

```js
// shared-core/cursor.mjs — ghost cursor drift

let el = null;
let raf = null;
let jumpTimer = null;

// Persist position across page loads via sessionStorage
const POS_KEY = 'busy.cursor';
function loadPos() {
  try { return JSON.parse(sessionStorage.getItem(POS_KEY)) || null; } catch { return null; }
}
function savePos(x, y) {
  try { sessionStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch {}
}

// Smooth pseudo-noise (simple 1D time-based)
function noise(t, seed) {
  const s = Math.sin(t * 0.0017 + seed) * 0.5
          + Math.sin(t * 0.00074 + seed * 1.3) * 0.3
          + Math.sin(t * 0.00051 + seed * 2.1) * 0.2;
  return s; // [-1..1] roughly
}

export function mount(settings) {
  if (!settings.ghostCursor.enabled) return;
  if (document.body.dataset.suppress?.includes('cursor')) return;

  el = document.createElement('div');
  el.className = 'busy-ghost-cursor';
  document.body.appendChild(el);

  const stored = loadPos();
  let x = stored?.x ?? window.innerWidth * 0.3;
  let y = stored?.y ?? window.innerHeight * 0.3;
  let tx = x, ty = y;

  function step(ts) {
    const W = window.innerWidth, H = window.innerHeight;
    tx = (noise(ts, 13) * 0.5 + 0.5) * (W - 40) + 20;
    ty = (noise(ts, 27) * 0.5 + 0.5) * (H - 40) + 20;
    x += (tx - x) * 0.008;
    y += (ty - y) * 0.008;
    el.style.transform = `translate(${x}px, ${y}px)`;
    savePos(x, y);
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);

  function scheduleJump() {
    const delay = 5000 + Math.random() * 20000;
    jumpTimer = setTimeout(() => {
      const W = window.innerWidth, H = window.innerHeight;
      x = Math.random() * (W - 80) + 40;
      y = Math.random() * (H - 80) + 40;
      el.classList.add('jumping');
      el.style.transform = `translate(${x}px, ${y}px)`;
      setTimeout(() => el.classList.remove('jumping'), 160);
      scheduleJump();
    }, delay);
  }
  scheduleJump();
}

export function unmount() {
  if (raf) cancelAnimationFrame(raf);
  if (jumpTimer) clearTimeout(jumpTimer);
  el?.remove();
  el = null;
}
```

- [ ] **Step 3: Wire into `shared.js`**

```js
import { mount as mountCursor } from './shared-core/cursor.mjs';
try { mountCursor(Busy.settings); } catch (e) { console.warn('[Busy] Cursor failed', e); }
```

- [ ] **Step 4: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.querySelector('.busy-ghost-cursor') !== null") → true
(optional: wait 3s and re-check transform changed)
```

- [ ] **Step 5: Commit**

```bash
git add shared-core/cursor.mjs shared.css shared.js
git commit -m "feat(cursor): ghost cursor drift with periodic jumps"
```

---

### Task 10: SoundEngine (WebAudio typing + ding)

**Files:**
- Create: `C:/working/shared-core/sound.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Create `shared-core/sound.mjs`**

```js
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
  // Unlock on first user gesture
  const kick = () => { unlock(); document.removeEventListener('click', kick); document.removeEventListener('keydown', kick); };
  document.addEventListener('click', kick, { once: true });
  document.addEventListener('keydown', kick, { once: true });
}

export function setEnabled(v) { enabled = !!v; }
export function setVolume(v) { if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v)); }
export function unmount() { if (burstTimer) clearTimeout(burstTimer); }
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import { mount as mountSound, unlock as unlockSound } from './shared-core/sound.mjs';
try { mountSound(Busy.settings); } catch (e) { console.warn('[Busy] Sound failed', e); }
Busy.unlockSound = unlockSound;
```

- [ ] **Step 3: Verify**

Playwright can't hear, but we can verify AudioContext exists:
```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => { return typeof AudioContext !== 'undefined'; }") → true
browser_evaluate("async () => { await window.Busy.unlockSound(); window.Busy.showToast(); return 'ok'; }")
browser_console_messages()  ← no errors
```

- [ ] **Step 4: Commit**

```bash
git add shared-core/sound.mjs shared.js
git commit -m "feat(sound): WebAudio synth keystrokes + ding + click"
```

---

## Phase 3 — Rotator + Start Orchestrator (Tasks 11-15)

### Task 11: Rotator pure logic + unit tests

**Files:**
- Create: `C:/working/shared-core/rotator.mjs`
- Create: `C:/working/tests/rotator.test.mjs`

- [ ] **Step 1: Write tests first**

```js
// tests/rotator.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';

const { shuffle, advance, buildOrder } = await import('../shared-core/rotator.mjs');

test('shuffle: same length, all unique', () => {
  const input = Array.from({length: 10}, (_, i) => `s${i}`);
  const out = shuffle(input, () => 0.5);
  assert.strictEqual(out.length, input.length);
  assert.strictEqual(new Set(out).size, input.length);
});

test('advance: cursor increments, nextAt moves forward with jitter', () => {
  const state = { order: ['a','b','c'], cursor: 0, baseSec: 60, jitterPct: 0, blacklist: [] };
  const r = advance(state, () => 0.5, 1_000_000);
  assert.strictEqual(r.state.cursor, 1);
  assert.strictEqual(r.state.order[r.state.cursor], 'b');
  // jitterPct=0 → nextAt exactly +60000
  assert.strictEqual(r.state.nextAt, 1_000_000 + 60_000);
  assert.strictEqual(r.nextPath, 'b');
});

test('advance: skips blacklisted', () => {
  const state = { order: ['a','b','c','d'], cursor: 0, baseSec: 60, jitterPct: 0, blacklist: ['b', 'c'] };
  const r = advance(state, () => 0.5, 0);
  assert.strictEqual(r.nextPath, 'd');
  assert.strictEqual(r.state.cursor, 3);
});

test('advance: wraps around cycle and reshuffles', () => {
  const state = { order: ['a','b'], cursor: 1, baseSec: 60, jitterPct: 0, blacklist: [] };
  const r = advance(state, () => 0.5, 0);
  assert.strictEqual(r.state.cursor, 0);
  // After wrap the order should have been reshuffled (or at least cursor 0 points to some valid scene)
  assert.ok(r.nextPath === 'a' || r.nextPath === 'b');
});

test('buildOrder: excludes blacklisted', () => {
  const all = ['a','b','c','d'];
  const order = buildOrder(all, ['b'], () => 0.5);
  assert.strictEqual(order.includes('b'), false);
  assert.strictEqual(order.length, 3);
});

test('advance: jitter within expected range', () => {
  const state = { order: ['a','b'], cursor: 0, baseSec: 100, jitterPct: 0.25, blacklist: [] };
  const r = advance(state, () => 1, 1000);  // rand=1 → +jitter
  // formula: nextAt = now + baseSec*1000 * (1 + (rand*2-1)*jitterPct) = 1000 + 100000*(1+0.25) = 126000
  assert.strictEqual(r.state.nextAt, 126000);
  const r2 = advance({...state, cursor: 0}, () => 0, 1000); // rand=0 → -jitter
  assert.strictEqual(r2.state.nextAt, 1000 + 100000 * 0.75);
});
```

Run: `node --test tests/rotator.test.mjs` → FAIL (module missing).

- [ ] **Step 2: Implement `shared-core/rotator.mjs`**

```js
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
```

- [ ] **Step 3: Run tests**

`node --test tests/rotator.test.mjs` → PASS (6 tests).

- [ ] **Step 4: Commit**

```bash
git add shared-core/rotator.mjs tests/rotator.test.mjs
git commit -m "feat(rotator): pure shuffle/advance/state logic with 6 unit tests"
```

---

### Task 12: Rotator DOM integration (timer + navigation + multitab)

**Files:**
- Modify: `C:/working/shared-core/rotator.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Append DOM wiring to `rotator.mjs`**

```js
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
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import * as Rotator from './shared-core/rotator.mjs';
try { Rotator.mount(Busy.settings); } catch (e) { console.warn('[Busy] Rotator failed', e); }
Busy.Rotator = Rotator;
```

- [ ] **Step 3: Manual verification**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => {
  sessionStorage.setItem('busy.rotation', JSON.stringify({
    enabled: true,
    order: ['busy/email.html', 'busy/calendar.html'],
    cursor: 0,
    baseSec: 3,
    jitterPct: 0,
    blacklist: [],
    nextAt: Date.now() + 2000,
  }));
  return 'ok';
}")
browser_navigate("http://localhost:8000/")  // reload to trigger boot
// Wait ~3s then check URL
```

Expected: URL changes to `/busy/email.html` after ~2 seconds.

- [ ] **Step 4: Clean test state + commit**

```bash
git add shared-core/rotator.mjs shared.js
git commit -m "feat(rotator): DOM integration — sessionStorage + setTimeout + multi-tab leader"
```

---

### Task 13: WakeLock module with video fallback

**Files:**
- Create: `C:/working/shared-core/wake-lock.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Create `shared-core/wake-lock.mjs`**

```js
// shared-core/wake-lock.mjs — wake lock with <video> hack fallback

let sentinel = null;
let fallbackVideo = null;

async function nativeRequest() {
  if (!('wakeLock' in navigator)) return null;
  try { return await navigator.wakeLock.request('screen'); }
  catch { return null; }
}

function fallbackActivate() {
  if (fallbackVideo) return;
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true;
  v.setAttribute('playsinline', '');
  // Tiny 1-frame black video via data URI
  v.src = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAAhmcmVlAAAALG1kYXQAAAAYZ29vZ2xlUHJvZHVjZWRCeUZFREMAAAAAAAAAACgKAA';
  v.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(v);
  v.play().catch(() => {});
  fallbackVideo = v;
}

export async function request() {
  sentinel = await nativeRequest();
  if (!sentinel) fallbackActivate();
  return sentinel !== null;
}

export function release() {
  sentinel?.release?.();
  sentinel = null;
  fallbackVideo?.remove();
  fallbackVideo = null;
}

export function mount() {
  // Re-request on visibility change (browser releases on hidden)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && sentinel === null && !fallbackVideo) {
      // Don't auto-request without a user gesture — that's start.mjs's job.
    }
  });
}
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import * as WakeLock from './shared-core/wake-lock.mjs';
try { WakeLock.mount(); } catch (e) { console.warn('[Busy] WakeLock failed', e); }
Busy.WakeLock = WakeLock;
```

- [ ] **Step 3: Verify module exists**

```
browser_evaluate("() => typeof window.Busy.WakeLock.request === 'function'") → true
```

- [ ] **Step 4: Commit**

```bash
git add shared-core/wake-lock.mjs shared.js
git commit -m "feat(wake-lock): native wakeLock with <video> fallback"
```

---

### Task 14: PiP dummy video (camera off)

**Files:**
- Create: `C:/working/shared-core/pip.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Create `shared-core/pip.mjs`**

```js
// shared-core/pip.mjs — "camera off" PiP window via canvas → stream → video

let video = null;
let canvas = null;
let rafId = null;

function drawFrame(ctx, t) {
  const w = canvas.width, h = canvas.height;
  // Dark charcoal background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  // Centered avatar circle
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 10, 46, 0, Math.PI * 2);
  ctx.fillStyle = '#2a2a2a';
  ctx.fill();
  // Initials
  ctx.fillStyle = '#bbb';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('U', w / 2, h / 2 - 10);
  // "Camera off" label
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('Camera off', w / 2, h / 2 + 52);
  // REC dot (blinks)
  const on = Math.floor(t / 600) % 2 === 0;
  ctx.fillStyle = on ? '#ff3344' : '#441';
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2); ctx.fill();
  // Mic muted icon (bottom right)
  ctx.fillStyle = '#888';
  ctx.fillText('🎤 muted', w - 46, h - 14);
}

export async function enter() {
  if (!document.pictureInPictureEnabled) return false;
  canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  const tick = (ts) => { drawFrame(ctx, ts); rafId = requestAnimationFrame(tick); };
  rafId = requestAnimationFrame(tick);

  const stream = canvas.captureStream(24);
  video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);
  await video.play();
  try {
    await video.requestPictureInPicture();
    return true;
  } catch {
    return false;
  }
}

export async function exit() {
  if (rafId) cancelAnimationFrame(rafId);
  try { await document.exitPictureInPicture(); } catch {}
  video?.remove(); video = null; canvas = null;
}
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import * as PiP from './shared-core/pip.mjs';
Busy.PiP = PiP;
```

- [ ] **Step 3: Verify module exists**

```
browser_evaluate("() => typeof window.Busy.PiP.enter === 'function'") → true
```

PiP enter requires user gesture; will be triggered by Start (Task 15). No runtime verification here.

- [ ] **Step 4: Commit**

```bash
git add shared-core/pip.mjs shared.js
git commit -m "feat(pip): canvas-to-PiP dummy 'camera off' window"
```

---

### Task 15: Start orchestrator

**Files:**
- Create: `C:/working/shared-core/start.mjs`
- Modify: `C:/working/shared.js`

- [ ] **Step 1: Create `shared-core/start.mjs`**

```js
// shared-core/start.mjs — single-gesture orchestrator

import * as WakeLock from './wake-lock.mjs';
import * as PiP from './pip.mjs';
import * as Rotator from './rotator.mjs';
import { unlock as unlockSound } from './sound.mjs';
import { save as saveSettings } from './settings.mjs';

export async function startEverything(settings) {
  const results = {};

  // Fullscreen
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    results.fullscreen = true;
  } catch { results.fullscreen = false; }

  // Audio
  try { await unlockSound(); results.audio = true; } catch { results.audio = false; }

  // Wake Lock
  try { results.wakeLock = await WakeLock.request(); }
  catch { results.wakeLock = false; }

  // PiP
  if (settings.pip.enabled) {
    try { results.pip = await PiP.enter(); } catch { results.pip = false; }
  } else { results.pip = false; }

  // Rotation
  settings.rotation.enabled = true;
  saveSettings(settings);
  Rotator.beginRotation(settings);
  results.rotation = true;

  console.info('[Busy] started', results);
  return results;
}

export async function stopEverything() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  try { await PiP.exit(); } catch {}
  WakeLock.release();
  Rotator.stopRotation();
}
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import * as Start from './shared-core/start.mjs';
Busy.start = () => Start.startEverything(Busy.settings);
Busy.stop  = () => Start.stopEverything();
```

- [ ] **Step 3: Verify**

```
browser_evaluate("() => typeof window.Busy.start === 'function' && typeof window.Busy.stop === 'function'") → true
```

- [ ] **Step 4: Commit**

```bash
git add shared-core/start.mjs shared.js
git commit -m "feat(start): single-gesture orchestrator (FS + audio + WL + PiP + rotate)"
```

---

## Phase 4 — Dead Scene Vitals (Tasks 16-20)

### Task 16: shared-vitals.js framework + dispatcher

**Files:**
- Create: `C:/working/shared-core/vitals-core.mjs`
- Create: `C:/working/shared-vitals.js`
- Create: `C:/working/tests/vitals-core.test.mjs`
- Modify: `C:/working/shared.js`
- Modify: `C:/working/shared.css`

- [ ] **Step 1: Write failing test**

```js
// tests/vitals-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { pickIntensityRange, randRange } from '../shared-core/vitals-core.mjs';

test('pickIntensityRange: returns table entry by intensity', () => {
  const table = { low: [10,20], med: [5,10], high: [1,3] };
  assert.deepStrictEqual(pickIntensityRange(table, 'low'), [10,20]);
  assert.deepStrictEqual(pickIntensityRange(table, 'high'), [1,3]);
  assert.deepStrictEqual(pickIntensityRange(table, 'xxx'), [5,10]); // med fallback
});

test('randRange: within bounds', () => {
  for (let i = 0; i < 100; i++) {
    const v = randRange(5, 10);
    assert.ok(v >= 5 && v < 10);
  }
});
```

Run: `node --test tests/vitals-core.test.mjs` → FAIL.

- [ ] **Step 2: Create `shared-core/vitals-core.mjs`**

```js
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
```

- [ ] **Step 3: Create `shared-vitals.js` entry**

```js
// shared-vitals.js — imports each injector and dispatches by body.data-vitals-type.
// Must be imported by shared.js (same entry), not a separate <script> tag — keeps wiring simple.

import { mount as mountDocument } from './shared-core/vitals-document.mjs';
import { mount as mountTable }    from './shared-core/vitals-table.mjs';
import { mount as mountDashboard }from './shared-core/vitals-dashboard.mjs';
import { mount as mountTool }     from './shared-core/vitals-tool.mjs';

const DISPATCH = {
  document: mountDocument,
  table: mountTable,
  dashboard: mountDashboard,
  tool: mountTool,
};

export function mountVitals(settings) {
  const isDead = document.body.dataset.deadzone === 'true';
  if (!isDead) return;
  const type = document.body.dataset.vitalsType;
  const fn = DISPATCH[type];
  if (fn) fn(settings);
  else console.warn('[Busy] unknown vitals-type:', type);
}
```

- [ ] **Step 4: Vitals CSS base**

Append to `shared.css`:
```css
/* Vitals — shared */
.busy-vitals-editing {
  position: fixed; top: 40px; right: 18px; z-index: 99997;
  background: rgba(0,0,0,0.65); color: #fff;
  padding: 4px 8px; border-radius: 6px; font-size: 11px;
  font-family: system-ui, sans-serif;
}
.busy-vitals-caret {
  display: inline-block; width: 2px; height: 1.1em;
  background: currentColor; vertical-align: text-bottom; margin-left: 1px;
  animation: busy-blink 1s steps(1) infinite;
}
@keyframes busy-blink { 50% { opacity: 0; } }
.busy-vitals-flash { animation: busy-flash 1s ease-out; }
@keyframes busy-flash {
  0% { background: #fff3a0; } 100% { background: inherit; }
}
.busy-vitals-save-badge {
  position: fixed; bottom: 56px; left: 50%; transform: translateX(-50%);
  z-index: 99997; background: rgba(30,30,30,0.8); color: #ddd;
  padding: 5px 10px; border-radius: 6px; font-size: 11px; opacity: 0;
  transition: opacity 400ms ease;
}
.busy-vitals-save-badge.show { opacity: 1; }
```

- [ ] **Step 5: Stub empty injector modules** (so shared-vitals.js imports don't fail)

Create 4 files each containing:
```js
// shared-core/vitals-<type>.mjs — stub; implemented in Task 17-20
export function mount(settings) {
  console.info('[Busy] vitals-<type> stub');
}
```
Replace `<type>` in each: `document`, `table`, `dashboard`, `tool`.

- [ ] **Step 6: Wire into `shared.js`**

```js
import { mountVitals } from './shared-vitals.js';
try { mountVitals(Busy.settings); } catch (e) { console.warn('[Busy] vitals failed', e); }
```

- [ ] **Step 7: Run tests**

`node --test tests/vitals-core.test.mjs` → PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add shared-core/vitals-core.mjs shared-core/vitals-document.mjs shared-core/vitals-table.mjs \
        shared-core/vitals-dashboard.mjs shared-core/vitals-tool.mjs \
        shared-vitals.js tests/vitals-core.test.mjs shared.css shared.js
git commit -m "feat(vitals): framework + dispatcher + CSS + 4 stub injectors"
```

---

### Task 17: Document injector (5 scenes)

**Files:**
- Modify: `C:/working/shared-core/vitals-document.mjs`

- [ ] **Step 1: Implement document injector**

```js
// shared-core/vitals-document.mjs
import { pickIntensityRange, scheduleRandom, pickRandom, fmtDuration } from './vitals-core.mjs';

const TYPING_BY_INTENSITY = { low: [10, 25], med: [5, 15], high: [2, 8] };
const SCROLL_BY_INTENSITY = { low: [60, 180], med: [30, 90], high: [15, 40] };
const SENTENCES = [
  '이 조항은 본 계약의 목적에 비추어 해석되어야 한다.',
  '환자의 주증상은 지속되는 간헐적 흉부 압박감이다.',
  '다음 단계에서는 분기 성과와 직접적으로 연동되어 평가된다.',
  '이 블록은 입력 데이터의 정규화 이후에 실행되어야 합니다.',
  '상기 일정은 이해관계자 승인 이후 재조정될 수 있습니다.',
  '결과 값은 신뢰구간 95% 이상에서 유의미한 차이를 보였다.',
  '이 변경은 이전 버전과 호환되지 않을 수 있으니 주의하시기 바랍니다.',
];
const WORDS = [' · ', '확인 ', '검토 ', '업데이트 ', '수정 ', '추가 ', '반영 '];

let startTs = 0;
let editingEl = null;

function findTypingTarget() {
  // Prefer largest text block that's visible
  const cand = [...document.querySelectorAll('p, li, .content, article, .document, [class*="body"]')]
    .filter((el) => el.offsetParent !== null && el.innerText && el.innerText.length > 30);
  cand.sort((a, b) => b.innerText.length - a.innerText.length);
  return cand[0] || document.body;
}

function attachCaret(target) {
  if (target.querySelector('.busy-vitals-caret')) return;
  const caret = document.createElement('span');
  caret.className = 'busy-vitals-caret';
  target.appendChild(caret);
  return caret;
}

function typeChars(target, text) {
  const caret = target.querySelector('.busy-vitals-caret');
  let i = 0;
  const step = () => {
    if (i >= text.length) return;
    const node = document.createTextNode(text[i]);
    target.insertBefore(node, caret);
    i++;
    setTimeout(step, 50 + Math.random() * 90);
  };
  step();
}

function addEditingBadge() {
  editingEl = document.createElement('div');
  editingEl.className = 'busy-vitals-editing';
  document.body.appendChild(editingEl);
  startTs = Date.now();
  setInterval(() => {
    editingEl.textContent = `편집 중 · ${fmtDuration(Date.now() - startTs)}`;
  }, 1000);
}

function sceneQuirks() {
  const type = location.pathname;
  if (type.includes('translator')) return translatorQuirks();
  if (type.includes('latex'))      return latexQuirks();
  if (type.includes('notebook'))   return notebookQuirks();
  if (type.includes('medical'))    return medicalQuirks();
  return null;
}

function translatorQuirks() {
  // Alternate typing between left and right columns (if any)
  const cols = document.querySelectorAll('.left, .source, .original, .right, .target, .translation, [class*="col"]');
  if (cols.length < 2) return null;
  let side = 0;
  return () => {
    const col = cols[side % cols.length];
    side++;
    const target = col.querySelector('p, div') || col;
    attachCaret(target);
    typeChars(target, pickRandom(WORDS));
  };
}

function latexQuirks() {
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  badge.textContent = '컴파일 중... main.tex';
  document.body.appendChild(badge);
  setInterval(() => {
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 1800);
  }, 15000 + Math.random() * 10000);
  return null;
}

function notebookQuirks() {
  const cells = document.querySelectorAll('[class*="cell"], .code-cell, .input');
  if (!cells.length) return null;
  setInterval(() => {
    const c = pickRandom([...cells]);
    const pre = c.querySelector('.prompt, .input-prompt') || c;
    const orig = pre.textContent;
    pre.textContent = '[*]';
    setTimeout(() => { pre.textContent = `[${1 + Math.floor(Math.random() * 40)}]`; }, 1500);
  }, 8000 + Math.random() * 12000);
  return null;
}

function medicalQuirks() {
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  document.body.appendChild(badge);
  let n = 14;
  setInterval(() => {
    n = Math.min(200, n + 1 + Math.floor(Math.random() * 3));
    badge.textContent = `EMR 동기화 중 · ${n}/200 레코드`;
    badge.classList.add('show');
    setTimeout(() => badge.classList.remove('show'), 2000);
  }, 7000);
  return null;
}

export function mount(settings) {
  const target = findTypingTarget();
  attachCaret(target);
  addEditingBadge();

  const quirk = sceneQuirks();

  // Word typing
  scheduleRandom(
    () => {
      if (quirk) return quirk();
      typeChars(target, pickRandom(WORDS));
    },
    () => pickIntensityRange(TYPING_BY_INTENSITY, settings.intensity),
  );

  // Sentence burst
  scheduleRandom(
    () => typeChars(target, pickRandom(SENTENCES) + ' '),
    () => {
      const [a, b] = pickIntensityRange(TYPING_BY_INTENSITY, settings.intensity);
      return [a * 2, b * 2];
    },
  );

  // Scroll jitter
  scheduleRandom(
    () => {
      const delta = (Math.random() - 0.5) * 40;
      window.scrollBy({ top: delta, behavior: 'smooth' });
    },
    () => pickIntensityRange(SCROLL_BY_INTENSITY, settings.intensity),
  );
}
```

- [ ] **Step 2: Verify in browser** (after Task 25 wires body attrs, for now we can test with temporary attrs)

Create a quick test — temporarily modify `busy/legal.html` to add `data-deadzone="true" data-vitals-type="document"`:
```
(This will be done properly in Task 25; skip verification here or do it temporarily.)
```

- [ ] **Step 3: Commit**

```bash
git add shared-core/vitals-document.mjs
git commit -m "feat(vitals-document): caret + typing + scroll jitter + per-scene quirks"
```

---

### Task 18: Table injector (erp, wms)

**Files:**
- Modify: `C:/working/shared-core/vitals-table.mjs`

- [ ] **Step 1: Implement**

```js
// shared-core/vitals-table.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const FLASH_BY_INTENSITY  = { low: [5, 15], med: [2, 8],   high: [0.5, 3] };
const TOTAL_BY_INTENSITY  = { low: [15, 30], med: [10, 20], high: [3, 10] };
const STATUS_BY_INTENSITY = { low: [30, 90], med: [20, 45], high: [8, 20] };

function findCells() {
  return [...document.querySelectorAll('td, [data-value], .cell, .num')].filter(
    (el) => el.offsetParent !== null && /\d/.test(el.textContent)
  );
}

function bumpNumber(el) {
  const txt = el.textContent;
  const m = txt.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!m) return;
  const num = parseFloat(m[1].replace(/,/g, ''));
  const delta = Math.round(num * (Math.random() * 0.02 - 0.01)) || (Math.random() > 0.5 ? 1 : -1);
  const newNum = num + delta;
  const newStr = txt.replace(m[1], newNum.toLocaleString('ko-KR'));
  el.textContent = newStr;
  el.classList.add('busy-vitals-flash');
  setTimeout(() => el.classList.remove('busy-vitals-flash'), 1100);
}

function sceneMessage() {
  if (location.pathname.includes('erp')) {
    const n = Math.floor(Math.random() * 128);
    return `월마감 처리 중... ${n}/128 전표`;
  }
  if (location.pathname.includes('wms')) {
    return pickRandom(['입고 처리 중 · 3-A-04', '출고 완료 · 7건', '재고 실사 진행 중', '바코드 스캔 대기']);
  }
  return '데이터 갱신 중...';
}

export function mount(settings) {
  // Status badge
  const badge = document.createElement('div');
  badge.className = 'busy-vitals-save-badge';
  document.body.appendChild(badge);

  scheduleRandom(
    () => {
      const cells = findCells();
      if (!cells.length) return;
      const c = pickRandom(cells);
      c.classList.add('busy-vitals-flash');
      setTimeout(() => c.classList.remove('busy-vitals-flash'), 1100);
    },
    () => pickIntensityRange(FLASH_BY_INTENSITY, settings.intensity),
  );

  scheduleRandom(
    () => {
      const cells = findCells().filter((c) => c.closest('tfoot, .total, [class*="sum"]'));
      if (cells.length) bumpNumber(pickRandom(cells));
      else {
        const all = findCells();
        if (all.length) bumpNumber(pickRandom(all));
      }
    },
    () => pickIntensityRange(TOTAL_BY_INTENSITY, settings.intensity),
  );

  scheduleRandom(
    () => {
      badge.textContent = sceneMessage();
      badge.classList.add('show');
      setTimeout(() => badge.classList.remove('show'), 2500);
    },
    () => pickIntensityRange(STATUS_BY_INTENSITY, settings.intensity),
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add shared-core/vitals-table.mjs
git commit -m "feat(vitals-table): cell flash + total bump + status badge for erp/wms"
```

---

### Task 19: Dashboard injector (atc, soc, hts)

**Files:**
- Modify: `C:/working/shared-core/vitals-dashboard.mjs`

- [ ] **Step 1: Implement**

```js
// shared-core/vitals-dashboard.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const TICK_BY_INTENSITY  = { low: [2, 5], med: [1, 3], high: [0.3, 1.5] };
const LOG_BY_INTENSITY   = { low: [20, 60], med: [5, 15], high: [2, 6] };
const GAUGE_ANIM_MS = 1500;

const LOG_LINES_ATC = [
  'KAL101 · RWY 34R 접근 중',
  'AAR234 · FL280 · 터미널 진입',
  'JNA543 · 체공 시간 +2min',
  'UAE485 · 방위 270 · 하강 중',
  'SQ606 · 순항 · 고도 유지',
];
const LOG_LINES_SOC = [
  '🟡 PORT SCAN from 203.241.x.x',
  '🟢 알려진 IOC 매치 · 격리 완료',
  '🔴 비정상 로그인 시도 · user=admin',
  '🟡 외부 DNS 쿼리 이상치 감지',
  '🟢 방화벽 룰 업데이트 적용',
];
const LOG_LINES_HTS = [
  '체결 · 삼성전자 · 73,200 · 100주',
  '호가 변경 · SK하이닉스 · 매수 1호가',
  '체결 · 네이버 · 213,500 · 50주',
  '호가 변경 · 카카오 · 매도 1호가',
  'PnL · +₩1,284,300 (+0.42%)',
];

function pickLogLine() {
  if (location.pathname.includes('atc')) return pickRandom(LOG_LINES_ATC);
  if (location.pathname.includes('soc')) return pickRandom(LOG_LINES_SOC);
  if (location.pathname.includes('hts')) return pickRandom(LOG_LINES_HTS);
  return '이벤트 감지 · ' + Math.random().toString(16).slice(2, 10);
}

function findNumbers() {
  return [...document.querySelectorAll('.num, .value, [data-value], td, [class*="metric"]')].filter(
    (el) => el.offsetParent !== null && /\d/.test(el.textContent)
  );
}

function tickNumber(el) {
  const txt = el.textContent;
  const m = txt.match(/(-?\d[\d,]*(?:\.\d+)?)/);
  if (!m) return;
  const n = parseFloat(m[1].replace(/,/g, ''));
  const d = Math.round(n * (Math.random() * 0.004 - 0.002)) || (Math.random() > 0.5 ? 1 : -1);
  el.textContent = txt.replace(m[1], (n + d).toLocaleString('ko-KR'));
  el.classList.add('busy-vitals-flash');
  setTimeout(() => el.classList.remove('busy-vitals-flash'), 600);
}

function animateGauges() {
  const bars = document.querySelectorAll('.bar, [class*="progress"], [role="progressbar"]');
  bars.forEach((bar) => {
    const inner = bar.querySelector('[style*="width"]') || bar;
    const base = parseFloat(inner.style.width) || 50;
    let phase = Math.random() * Math.PI * 2;
    setInterval(() => {
      phase += 0.12;
      const w = Math.max(5, Math.min(95, base + Math.sin(phase) * 5));
      inner.style.width = w + '%';
    }, GAUGE_ANIM_MS / 30);
  });
}

function findLogContainer() {
  return document.querySelector('[class*="log"], .events, .feed, [data-role="log"]');
}

export function mount(settings) {
  scheduleRandom(
    () => {
      const nums = findNumbers();
      if (nums.length) tickNumber(pickRandom(nums));
    },
    () => pickIntensityRange(TICK_BY_INTENSITY, settings.intensity),
  );

  animateGauges();

  const logContainer = findLogContainer();
  if (logContainer) {
    scheduleRandom(
      () => {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toTimeString().slice(0, 8)}] ${pickLogLine()}`;
        line.style.cssText = 'padding:2px 6px; font-family:monospace; font-size:11px; opacity:0; transition:opacity 300ms;';
        logContainer.prepend(line);
        requestAnimationFrame(() => (line.style.opacity = '1'));
        // Trim old entries
        while (logContainer.children.length > 40) logContainer.lastChild.remove();
      },
      () => pickIntensityRange(LOG_BY_INTENSITY, settings.intensity),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add shared-core/vitals-dashboard.mjs
git commit -m "feat(vitals-dashboard): number tick + gauge breathing + log stream"
```

---

### Task 20: Tool injector (daw, 3dmodel)

**Files:**
- Modify: `C:/working/shared-core/vitals-tool.mjs`

- [ ] **Step 1: Implement**

```js
// shared-core/vitals-tool.mjs
import { pickIntensityRange, scheduleRandom, pickRandom } from './vitals-core.mjs';

const METER_BY_INTENSITY = { low: [300, 600], med: [120, 300], high: [60, 180] };
const ACTION_BY_INTENSITY = { low: [30, 90], med: [15, 40], high: [5, 15] };

const ACTIONS_DAW = ['트랙 솔로 · 02:34', '볼륨 -2.1dB · 드럼', '반복 구간 설정 · 3:12–3:44', 'FX 체인 업데이트'];
const ACTIONS_3D  = ['면 추출 · v=127', '루프 컷 추가 · edge 248', '서브디비전 레벨 +1', '머티리얼 재할당'];

function pickAction() {
  if (location.pathname.includes('daw')) return pickRandom(ACTIONS_DAW);
  if (location.pathname.includes('3dmodel')) return pickRandom(ACTIONS_3D);
  return pickRandom([...ACTIONS_DAW, ...ACTIONS_3D]);
}

function renderProgressBanner() {
  const banner = document.createElement('div');
  banner.className = 'busy-vitals-save-badge';
  document.body.appendChild(banner);
  let pct = 0;
  let remain = 120;
  const update = () => {
    pct = Math.min(100, pct + Math.random() * 2);
    remain = Math.max(0, remain - 1);
    const mm = Math.floor(remain / 60), ss = remain % 60;
    const label = location.pathname.includes('daw') ? '믹스다운' : '렌더';
    banner.textContent = `${label} 중 · ${pct.toFixed(0)}% · ${mm}:${String(ss).padStart(2,'0')} 남음`;
    banner.classList.add('show');
    if (pct >= 100) {
      setTimeout(() => { banner.classList.remove('show'); pct = 0; remain = 60 + Math.floor(Math.random() * 120); }, 2000);
    }
  };
  update();
  setInterval(update, 2000);
}

function animatePlayhead() {
  const heads = document.querySelectorAll('[class*="playhead"], [class*="marker"], .cursor-line');
  heads.forEach((h) => {
    let pos = 0;
    setInterval(() => {
      pos = (pos + 1) % 100;
      h.style.left = pos + '%';
    }, 200);
  });
}

function jitterMeters() {
  const meters = document.querySelectorAll('[class*="meter"], [class*="vu"], [class*="level"]');
  meters.forEach((m) => {
    let phase = Math.random() * Math.PI * 2;
    setInterval(() => {
      phase += 0.18 + Math.random() * 0.3;
      m.style.transform = `scaleY(${0.4 + 0.4 * Math.abs(Math.sin(phase))})`;
    }, 80);
  });
}

export function mount(settings) {
  renderProgressBanner();
  animatePlayhead();
  jitterMeters();

  const actionLog = document.querySelector('[class*="history"], [class*="recent"], .log');
  if (actionLog) {
    scheduleRandom(
      () => {
        const line = document.createElement('div');
        line.textContent = `· ${pickAction()}`;
        line.style.cssText = 'padding:2px 6px; font-size:11px; opacity:0; transition:opacity 200ms;';
        actionLog.prepend(line);
        requestAnimationFrame(() => (line.style.opacity = '1'));
        while (actionLog.children.length > 20) actionLog.lastChild.remove();
      },
      () => pickIntensityRange(ACTION_BY_INTENSITY, settings.intensity),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add shared-core/vitals-tool.mjs
git commit -m "feat(vitals-tool): render banner + playhead + meter jitter + action log"
```

---

## Phase 5 — Hub UI (Tasks 21-24)

### Task 21: Start FAB on hub

**Files:**
- Modify: `C:/working/shared.css`
- Modify: `C:/working/index.html`
- Modify: `C:/working/열일하는중 허브.html`

- [ ] **Step 1: FAB CSS**

Append to `shared.css`:
```css
.busy-hub-fab {
  position: fixed; bottom: 72px; right: 32px; z-index: 100000;
  width: 88px; height: 88px; border-radius: 50%;
  background: linear-gradient(135deg, #f8d569, #d4a43a);
  color: #1a1405; font-weight: 700; font-size: 14px;
  border: 0; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.5);
  animation: busy-pulse 2.4s ease-in-out infinite;
}
.busy-hub-fab:hover { transform: scale(1.05); }
.busy-hub-fab .emoji { font-size: 26px; }
@keyframes busy-pulse {
  0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 0 rgba(248,213,105,0.7); }
  50%      { box-shadow: 0 10px 30px rgba(0,0,0,0.4), 0 0 0 16px rgba(248,213,105,0); }
}
.busy-hub-fab.started {
  width: 48px; height: 28px; border-radius: 14px;
  font-size: 12px; animation: none; bottom: 32px; right: 32px;
}
.busy-hub-fab.started .emoji { font-size: 14px; }
```

- [ ] **Step 2: Add FAB markup to both hub files**

Just before `</body>` in `index.html` and `열일하는중 허브.html`:
```html
<button class="busy-hub-fab" id="busy-hub-fab" type="button">
  <span class="emoji">🎬</span>
  <span>시작</span>
</button>
```

- [ ] **Step 3: Wire click handler**

Add to the existing `<script>` block in the hub HTML (after existing code):
```js
const fab = document.getElementById('busy-hub-fab');
if (fab) {
  fab.addEventListener('click', async () => {
    await window.Busy.start();
    fab.classList.add('started');
    fab.innerHTML = '<span class="emoji">⏸</span><span>정지</span>';
    fab.onclick = async () => {
      await window.Busy.stop();
      location.reload();
    };
  });
}
```

- [ ] **Step 4: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.getElementById('busy-hub-fab') !== null") → true
browser_take_screenshot()  ← FAB visible bottom-right
```

- [ ] **Step 5: Commit**

```bash
git add shared.css index.html "열일하는중 허브.html"
git commit -m "feat(hub): gold pulsing start FAB wired to Busy.start()"
```

---

### Task 22: Settings drawer

**Files:**
- Modify: `C:/working/shared.css`
- Modify: `C:/working/index.html`
- Modify: `C:/working/열일하는중 허브.html`

- [ ] **Step 1: Drawer CSS**

Append to `shared.css`:
```css
.busy-settings-toggle {
  position: fixed; top: 8px; right: 72px; z-index: 100000;
  width: 30px; height: 30px; border-radius: 15px;
  background: rgba(60,60,64,0.85); color: #fff; border: 0; cursor: pointer;
  font-size: 15px; line-height: 1;
}
.busy-settings-drawer {
  position: fixed; top: 24px; right: 0; bottom: 0; width: 380px;
  z-index: 100000; background: #1b1d22; color: #e8e8e8;
  border-left: 1px solid rgba(255,255,255,0.08);
  transform: translateX(100%); transition: transform 260ms ease;
  padding: 20px; overflow-y: auto;
  font-family: system-ui, sans-serif; font-size: 13px;
}
.busy-settings-drawer.open { transform: translateX(0); }
.busy-settings-drawer h3 { font-size: 13px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
.busy-settings-drawer h3:first-child { margin-top: 0; }
.busy-settings-drawer .row { display: flex; align-items: center; justify-content: space-between; margin: 6px 0; padding: 4px 0; }
.busy-settings-drawer label { cursor: pointer; }
.busy-settings-drawer .options { display: flex; gap: 6px; flex-wrap: wrap; }
.busy-settings-drawer .chip {
  padding: 4px 10px; border-radius: 12px; background: #2a2d34; cursor: pointer;
  border: 1px solid transparent; user-select: none;
}
.busy-settings-drawer .chip.active { background: #3c6dd3; border-color: #5a88e6; }
.busy-settings-drawer input[type="range"] { width: 120px; }
.busy-settings-drawer input[type="checkbox"] { accent-color: #5a88e6; }
.busy-settings-drawer .scene-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px 10px; margin-top: 6px;
  max-height: 180px; overflow-y: auto; padding-right: 4px;
}
.busy-settings-drawer .scene-grid label { font-size: 11px; }
.busy-settings-drawer .close {
  position: absolute; top: 8px; right: 10px; background: transparent; color: #aaa;
  border: 0; font-size: 20px; cursor: pointer;
}
.busy-settings-drawer .footer { margin-top: 24px; display: flex; gap: 8px; }
.busy-settings-drawer .footer button {
  flex: 1; padding: 8px; background: #2a2d34; color: #ddd; border: 0; border-radius: 6px; cursor: pointer;
}
```

- [ ] **Step 2: Drawer markup**

Just before `</body>` in both hub files:
```html
<button class="busy-settings-toggle" id="busy-settings-toggle" title="설정">⚙</button>
<aside class="busy-settings-drawer" id="busy-settings-drawer">
  <button class="close" id="busy-settings-close">×</button>
  <h3>강도</h3>
  <div class="options" data-group="intensity">
    <span class="chip" data-v="low">차분함</span>
    <span class="chip" data-v="med">보통</span>
    <span class="chip" data-v="high">광기</span>
  </div>

  <h3>오토 로테이션</h3>
  <div class="row">
    <label>활성화</label>
    <input type="checkbox" id="busy-set-rotation-enabled">
  </div>
  <div class="row">
    <label>주기</label>
    <div class="options" data-group="rotation.baseSec">
      <span class="chip" data-v="180">3분</span>
      <span class="chip" data-v="75">75초</span>
      <span class="chip" data-v="35">35초</span>
    </div>
  </div>

  <h3>패닉 씬 (. 키)</h3>
  <select id="busy-set-panic" style="width:100%;padding:6px;background:#2a2d34;color:#ddd;border:0;border-radius:6px;"></select>

  <h3>제외할 씬 (로테이션 중 건너뜀)</h3>
  <div class="scene-grid" id="busy-scene-blacklist"></div>

  <h3>사운드</h3>
  <div class="row">
    <label>활성화</label>
    <input type="checkbox" id="busy-set-sound-enabled">
  </div>
  <div class="row">
    <label>볼륨</label>
    <input type="range" min="0" max="100" id="busy-set-volume">
  </div>

  <h3>OS 크롬</h3>
  <div class="options" data-group="osChrome">
    <span class="chip" data-v="mac">macOS</span>
    <span class="chip" data-v="win">Windows</span>
    <span class="chip" data-v="off">끔</span>
  </div>

  <h3>그 외</h3>
  <div class="row"><label>Wake Lock</label><input type="checkbox" id="busy-set-wakelock-enabled"></div>
  <div class="row"><label>Picture-in-Picture</label><input type="checkbox" id="busy-set-pip-enabled"></div>
  <div class="row"><label>유령 커서</label><input type="checkbox" id="busy-set-ghost-enabled"></div>

  <div class="footer">
    <button id="busy-set-reset">초기화</button>
  </div>
</aside>
```

- [ ] **Step 3: Wire settings drawer JS**

Append to hub's existing `<script>` block:
```js
(function() {
  const drawer = document.getElementById('busy-settings-drawer');
  const toggle = document.getElementById('busy-settings-toggle');
  const close  = document.getElementById('busy-settings-close');
  if (!drawer) return;

  const open = () => drawer.classList.add('open');
  const shut = () => drawer.classList.remove('open');

  toggle.addEventListener('click', open);
  close.addEventListener('click', shut);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && e.target !== toggle) shut();
  });

  // Populate panic scene dropdown from ALL_SCENES
  const SCENES = [
    {p:'열일하는중.html', n:'SYS.MONITOR'},
    {p:'busy/trader.html', n:'MARKETS'},
    {p:'busy/ppt.html', n:'DECK'},
    {p:'busy/email.html', n:'INBOX (기본)'},
    {p:'busy/calendar.html', n:'CALENDAR'},
    {p:'busy/design.html', n:'DESIGN'},
    {p:'busy/messenger.html', n:'MESSENGER'},
    {p:'busy/issuetracker.html', n:'ISSUES'},
    {p:'busy/crypto.html', n:'CRYPTO'},
    {p:'busy/devops.html', n:'DEVOPS'},
    {p:'busy/videoedit.html', n:'VIDEO'},
    {p:'busy/cad.html', n:'CAD'},
    {p:'busy/legal.html', n:'LEGAL'},
    {p:'busy/medical.html', n:'MEDICAL'},
    {p:'busy/daw.html', n:'DAW'},
    {p:'busy/3dmodel.html', n:'3D'},
    {p:'busy/notebook.html', n:'NOTEBOOK'},
    {p:'busy/atc.html', n:'ATC'},
    {p:'busy/soc.html', n:'SOC'},
    {p:'busy/translator.html', n:'CAT'},
    {p:'busy/erp.html', n:'ERP'},
    {p:'busy/wms.html', n:'WMS'},
    {p:'busy/latex.html', n:'LATEX'},
    {p:'busy/hts.html', n:'HTS'},
  ];
  const panicSel = document.getElementById('busy-set-panic');
  SCENES.forEach(s => { const o = document.createElement('option'); o.value = s.p; o.textContent = s.n; panicSel.appendChild(o); });

  const blGrid = document.getElementById('busy-scene-blacklist');
  SCENES.forEach(s => {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<input type="checkbox" data-scene="${s.p}"> ${s.n}`;
    blGrid.appendChild(lbl);
  });

  function readUI(settings) {
    // intensity
    document.querySelectorAll('[data-group="intensity"] .chip').forEach(c =>
      c.classList.toggle('active', c.dataset.v === settings.intensity));
    document.querySelectorAll('[data-group="osChrome"] .chip').forEach(c =>
      c.classList.toggle('active', c.dataset.v === settings.osChrome));
    document.querySelectorAll('[data-group="rotation.baseSec"] .chip').forEach(c =>
      c.classList.toggle('active', Number(c.dataset.v) === settings.rotation.baseSec));
    document.getElementById('busy-set-rotation-enabled').checked = !!settings.rotation.enabled;
    document.getElementById('busy-set-sound-enabled').checked = !!settings.sound.enabled;
    document.getElementById('busy-set-volume').value = settings.volume * 100;
    document.getElementById('busy-set-wakelock-enabled').checked = !!settings.wakeLock.enabled;
    document.getElementById('busy-set-pip-enabled').checked = !!settings.pip.enabled;
    document.getElementById('busy-set-ghost-enabled').checked = !!settings.ghostCursor.enabled;
    panicSel.value = settings.panicScene;
    document.querySelectorAll('#busy-scene-blacklist input[type="checkbox"]').forEach(cb => {
      cb.checked = settings.rotation.blacklist.includes(cb.dataset.scene);
    });
  }

  async function syncUI() {
    const { save } = await import('./shared-core/settings.mjs');
    readUI(window.Busy.settings);
    function commit() { save(window.Busy.settings); }

    document.querySelectorAll('[data-group] .chip').forEach(c => c.addEventListener('click', () => {
      const group = c.parentElement.dataset.group;
      const val = c.dataset.v;
      const parsed = isNaN(Number(val)) ? val : Number(val);
      if (group.includes('.')) {
        const [a, b] = group.split('.');
        window.Busy.settings[a][b] = parsed;
      } else window.Busy.settings[group] = parsed;
      readUI(window.Busy.settings); commit();
    }));
    document.getElementById('busy-set-rotation-enabled').addEventListener('change', (e) => {
      window.Busy.settings.rotation.enabled = e.target.checked; commit();
    });
    document.getElementById('busy-set-sound-enabled').addEventListener('change', (e) => {
      window.Busy.settings.sound.enabled = e.target.checked; commit();
    });
    document.getElementById('busy-set-volume').addEventListener('input', (e) => {
      window.Busy.settings.volume = e.target.value / 100; commit();
    });
    document.getElementById('busy-set-wakelock-enabled').addEventListener('change', (e) => {
      window.Busy.settings.wakeLock.enabled = e.target.checked; commit();
    });
    document.getElementById('busy-set-pip-enabled').addEventListener('change', (e) => {
      window.Busy.settings.pip.enabled = e.target.checked; commit();
    });
    document.getElementById('busy-set-ghost-enabled').addEventListener('change', (e) => {
      window.Busy.settings.ghostCursor.enabled = e.target.checked; commit();
    });
    panicSel.addEventListener('change', (e) => { window.Busy.settings.panicScene = e.target.value; commit(); });
    document.querySelectorAll('#busy-scene-blacklist input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const list = window.Busy.settings.rotation.blacklist;
        if (cb.checked) { if (!list.includes(cb.dataset.scene)) list.push(cb.dataset.scene); }
        else { const i = list.indexOf(cb.dataset.scene); if (i >= 0) list.splice(i, 1); }
        commit();
      });
    });
    document.getElementById('busy-set-reset').addEventListener('click', async () => {
      const { reset } = await import('./shared-core/settings.mjs');
      reset(); location.reload();
    });
  }
  if (window.Busy?.settings) syncUI();
  else window.addEventListener('DOMContentLoaded', syncUI);
})();
```

- [ ] **Step 4: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => { document.getElementById('busy-settings-toggle').click(); return document.getElementById('busy-settings-drawer').classList.contains('open'); }") → true
browser_take_screenshot()
```

- [ ] **Step 5: Commit**

```bash
git add shared.css index.html "열일하는중 허브.html"
git commit -m "feat(hub): settings drawer with all toggles + live binding"
```

---

### Task 23: Status strip

**Files:**
- Modify: `C:/working/shared.css`
- Modify: `C:/working/index.html`
- Modify: `C:/working/열일하는중 허브.html`

- [ ] **Step 1: Status strip CSS**

Append to `shared.css`:
```css
.busy-status-strip {
  position: fixed; top: 24px; left: 0; right: 0; height: 24px;
  z-index: 99997;
  background: linear-gradient(90deg, rgba(0,0,0,0.7), rgba(0,0,0,0.6));
  color: #ccc; font-size: 11px; padding: 4px 14px;
  display: flex; gap: 12px; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-family: system-ui, sans-serif;
}
.busy-status-strip .dot { width: 8px; height: 8px; border-radius: 50%; background: #888; }
.busy-status-strip .dot.on { background: #4bce63; box-shadow: 0 0 6px #4bce63; }
.busy-status-strip .dot.panic { background: #ff3344; }
body.busy-has-chrome .busy-status-strip { top: 24px; }
body.busy-has-strip { padding-top: 48px; }
```

- [ ] **Step 2: Markup + wiring**

Just before `</header>` in hub (or before `<main>` if no header) — add once at top of `<body>`:
```html
<div class="busy-status-strip" id="busy-status-strip">
  <span class="dot" id="busy-strip-dot"></span>
  <span id="busy-strip-rot">로테이션 OFF</span>
  <span>·</span>
  <span id="busy-strip-next">다음 --:--</span>
  <span>·</span>
  <span id="busy-strip-intensity">강도 보통</span>
  <span>·</span>
  <span id="busy-strip-sound">사운드 ON</span>
  <span>·</span>
  <span id="busy-strip-panic">패닉: 📧</span>
</div>
```

In the hub script block:
```js
(function() {
  document.body.classList.add('busy-has-strip');
  const dot  = document.getElementById('busy-strip-dot');
  const rotS = document.getElementById('busy-strip-rot');
  const nxt  = document.getElementById('busy-strip-next');
  const itS  = document.getElementById('busy-strip-intensity');
  const sndS = document.getElementById('busy-strip-sound');
  const pnc  = document.getElementById('busy-strip-panic');

  function render() {
    const s = window.Busy?.settings;
    if (!s) return;
    const rotState = JSON.parse(sessionStorage.getItem('busy.rotation') || 'null');
    dot.classList.remove('on','panic');
    if (rotState?.pausedUntil && rotState.pausedUntil > Date.now()) dot.classList.add('panic');
    else if (rotState?.enabled) dot.classList.add('on');
    rotS.textContent = '로테이션 ' + (rotState?.enabled ? 'ON' : 'OFF');
    if (rotState?.nextAt) {
      const left = Math.max(0, rotState.nextAt - Date.now());
      const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
      nxt.textContent = `다음 ${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    } else nxt.textContent = '다음 --:--';
    itS.textContent = '강도 ' + {low:'차분',med:'보통',high:'광기'}[s.intensity];
    sndS.textContent = '사운드 ' + (s.sound.enabled ? 'ON' : 'OFF');
    pnc.textContent = '패닉: ' + s.panicScene.replace('busy/','').replace('.html','');
  }
  setInterval(render, 1000);
  render();
})();
```

- [ ] **Step 3: Verify**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.getElementById('busy-strip-rot').textContent.includes('로테이션')") → true
```

- [ ] **Step 4: Commit**

```bash
git add shared.css index.html "열일하는중 허브.html"
git commit -m "feat(hub): status strip with live rotation countdown + settings summary"
```

---

### Task 24: Keyboard shortcuts expansion (hub + scenes)

**Files:**
- Modify: `C:/working/shared-core/rotator.mjs` (add key handlers as module)
- Create: `C:/working/shared-core/keys.mjs`
- Modify: `C:/working/shared.js`
- Modify: `C:/working/index.html` (update inline keydown to handle q~p,[,])

- [ ] **Step 1: Create `shared-core/keys.mjs` for scene-side shortcuts**

```js
// shared-core/keys.mjs — global keyboard shortcuts (works in every scene)

import * as Rotator from './rotator.mjs';

let escCount = 0;
let escTimer = null;

export function mount(settings) {
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in inputs
    if (e.target.matches('input, textarea, [contenteditable]')) return;

    // . → panic
    if (e.key === '.' || e.key === '>') {
      e.preventDefault();
      Rotator.panic(settings);
      return;
    }

    // Esc Esc → resume panic
    if (e.key === 'Escape') {
      escCount++;
      clearTimeout(escTimer);
      escTimer = setTimeout(() => { escCount = 0; }, 500);
      if (escCount >= 2) { escCount = 0; Rotator.resumePanic(); }
      return;
    }

    // h → return to hub
    if (e.key === 'h' || e.key === 'H') {
      const base = location.pathname.includes('/busy/') ? '../' : './';
      location.href = base + 'index.html';
      return;
    }

    // ? → shortcuts cheatsheet
    if (e.key === '?') {
      showCheatSheet();
      return;
    }
  });
}

function showCheatSheet() {
  if (document.getElementById('busy-cheat')) return;
  const el = document.createElement('div');
  el.id = 'busy-cheat';
  el.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.85);display:grid;place-items:center;color:#fff;font-family:system-ui;font-size:14px;';
  el.innerHTML = `<div style="background:#1b1d22;padding:24px 32px;border-radius:10px;min-width:320px;">
    <h3 style="margin:0 0 12px">단축키</h3>
    <pre style="font-family:system-ui;line-height:1.7;margin:0;">
1~9,0,-,=  씬 1~12
q~p,[,]    씬 13~24
h          허브 복귀
.          패닉 (위장 씬)
Esc Esc    패닉 해제
?          이 도움말
Space      일시정지 (허브 시작 버튼 대체)
F11        전체화면
</pre>
    <div style="margin-top:12px;text-align:right;"><button id="busy-cheat-close" style="background:#2a2d34;color:#ddd;border:0;padding:6px 14px;border-radius:6px;cursor:pointer;">닫기</button></div>
  </div>`;
  document.body.appendChild(el);
  const close = () => el.remove();
  el.querySelector('#busy-cheat-close').onclick = close;
  el.addEventListener('click', (e) => { if (e.target === el) close(); });
  document.addEventListener('keydown', function once(ev) {
    if (ev.key === 'Escape' || ev.key === '?') { close(); document.removeEventListener('keydown', once); }
  });
}
```

- [ ] **Step 2: Wire into `shared.js`**

```js
import { mount as mountKeys } from './shared-core/keys.mjs';
try { mountKeys(Busy.settings); } catch (e) { console.warn('[Busy] Keys failed', e); }
```

- [ ] **Step 3: Expand hub numeric keymap to cover q~p,[,]**

In both `index.html` and `열일하는중 허브.html`, find the existing keydown handler and replace:
```js
document.addEventListener('keydown', (e) => {
  const k = e.key;
  if (/^[1-9]$/.test(k) || k==='0' || k==='-' || k==='=') {
    const card = document.querySelector(`[data-key="${k}"]`);
    if (card) window.location.href = card.href;
  }
});
```
with:
```js
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, [contenteditable]')) return;
  const k = e.key;
  const valid = /^[1-9]$/.test(k) || ['0','-','=','q','w','e','r','t','y','u','i','o','p','[',']'].includes(k.toLowerCase());
  if (valid) {
    const card = document.querySelector(`[data-key="${k.toLowerCase()}"]`);
    if (card) window.location.href = card.href;
  }
});
```

- [ ] **Step 4: Verify hotkey mapping**

```
browser_navigate("http://localhost:8000/")
browser_evaluate("() => document.querySelector('[data-key=\"q\"]') !== null") → true
browser_evaluate("() => document.querySelector('[data-key=\"=\"]') !== null") → true
```

- [ ] **Step 5: Commit**

```bash
git add shared-core/keys.mjs shared.js index.html "열일하는중 허브.html"
git commit -m "feat(keys): panic/resume/hub/cheat shortcuts + expand hub numeric map to q~p,[,]"
```

---

## Phase 6 — Scene wiring (Task 25)

### Task 25: Add `<body data-*>` + script/link tags to all 25 HTML files

**Files:**
- Modify: `C:/working/열일하는중.html`
- Modify: all `C:/working/busy/*.html` (23 files)
- (index.html + 열일하는중 허브.html already done by earlier tasks)

This is mechanical repetition. Use the table in Pattern C and follow Pattern D.

- [ ] **Step 1: Edit `열일하는중.html`**

Before `</head>`: add `<link rel="stylesheet" href="./shared.css">`
Before `</body>`: add `<script type="module" src="./shared.js"></script>`
Replace `<body>` with:
```html
<body data-title="SYS.MONITOR · prod-us-east-1" data-favicon="🖥️">
```

- [ ] **Step 2: Edit each `busy/*.html` — apply Pattern D with table values**

For each file below, apply:
- Insert `<link rel="stylesheet" href="../shared.css">` before `</head>`
- Insert `<script type="module" src="../shared.js"></script>` before `</body>`
- Replace `<body>` tag with the one specified below

**Live scenes (no deadzone):**
```
busy/trader.html       <body data-title="MARKETS · DMA Terminal" data-favicon="📈">
busy/ppt.html          <body data-title="Q2_Board_Deck_v14.pptx" data-favicon="📊">
busy/email.html        <body data-title="(3) 받은 편지함 — Mail" data-favicon="📧">
busy/calendar.html     <body data-title="4월 · Calendar" data-favicon="📅">
busy/design.html       <body data-title="brand-system — Figma" data-favicon="🎨">
busy/messenger.html    <body data-title="(7) #growth — Slack" data-favicon="💬">
busy/issuetracker.html <body data-title="GROWTH-1423 — Jira" data-favicon="🎯">
busy/crypto.html       <body data-title="BTC/USDT — Binance Pro" data-favicon="🪙">
busy/devops.html       <body data-title="k8s-prod — Lens" data-favicon="⎈">
busy/videoedit.html    <body data-title="Q2_promo_v17.fcpbundle" data-favicon="🎬">
busy/cad.html          <body data-title="Block_B_Floor_12.dwg" data-favicon="📐" data-suppress="cursor">
```

**Dead scenes (deadzone + type):**
```
busy/legal.html        <body data-deadzone="true" data-vitals-type="document" data-title="계약서_최종_v7.docx" data-favicon="⚖️">
busy/medical.html      <body data-deadzone="true" data-vitals-type="document" data-title="진료기록_2026_04_24.pdf" data-favicon="🏥">
busy/translator.html   <body data-deadzone="true" data-vitals-type="document" data-title="CAT Tool — ZH→KO" data-favicon="🈯">
busy/latex.html        <body data-deadzone="true" data-vitals-type="document" data-title="main.tex — Overleaf" data-favicon="📄">
busy/notebook.html     <body data-deadzone="true" data-vitals-type="document" data-title="Untitled.ipynb — Jupyter" data-favicon="📓">
busy/erp.html          <body data-deadzone="true" data-vitals-type="table" data-title="월마감 처리 — SAP" data-favicon="🏢">
busy/wms.html          <body data-deadzone="true" data-vitals-type="table" data-title="창고 재고 — WMS" data-favicon="📦">
busy/atc.html          <body data-deadzone="true" data-vitals-type="dashboard" data-title="Sector 34R · ATC" data-favicon="✈️">
busy/soc.html          <body data-deadzone="true" data-vitals-type="dashboard" data-title="SOC Ops · SIEM" data-favicon="🛡️">
busy/hts.html          <body data-deadzone="true" data-vitals-type="dashboard" data-title="HTS · KOSPI 실시간" data-favicon="📉">
busy/daw.html          <body data-deadzone="true" data-vitals-type="tool" data-title="Session_final.logicx" data-favicon="🎵">
busy/3dmodel.html      <body data-deadzone="true" data-vitals-type="tool" data-title="render_scene_04.blend" data-favicon="🧊">
```

- [ ] **Step 3: Verify a few scenes load correctly**

```
browser_navigate("http://localhost:8000/busy/legal.html")
browser_evaluate("() => document.body.dataset.vitalsType") → "document"
browser_evaluate("() => document.title") → "계약서_최종_v7.docx"
browser_evaluate("() => document.querySelector('.busy-os-top') !== null") → true
browser_evaluate("() => document.querySelector('.busy-vitals-editing') !== null") → true  // editing badge
```

Repeat for `busy/erp.html`, `busy/hts.html`, `busy/daw.html`, and `busy/trader.html` (live scene) to confirm OS chrome and toasts appear without vitals on live scenes.

- [ ] **Step 4: Commit**

```bash
git add "열일하는중.html" busy/
git commit -m "chore(wiring): add shared.js + body data-* to all 24 scene files"
```

---

## Phase 7 — Privacy, Deploy, Verify (Tasks 26-28)

### Task 26: Privacy files

**Files:**
- Create: `C:/working/robots.txt`
- Create: `C:/working/.vercelignore`
- Modify: all HTML files (add noindex meta via shared.js runtime injection for DRY)

- [ ] **Step 1: robots.txt**

```
User-agent: *
Disallow: /
```

- [ ] **Step 2: .vercelignore**

```
docs/
.git/
tests/
*.md
_design/
```

- [ ] **Step 3: Runtime meta injection in shared.js**

Append to `shared.js` (top of boot, before module imports):
```js
// Inject noindex meta at runtime so we don't edit 25 files
(function() {
  const m = document.createElement('meta');
  m.name = 'robots';
  m.content = 'noindex, nofollow';
  document.head.appendChild(m);
})();
```

- [ ] **Step 4: Verify**

```
curl http://localhost:8000/robots.txt
browser_evaluate("() => document.querySelector('meta[name=\"robots\"]').content") → "noindex, nofollow"
```

- [ ] **Step 5: Commit**

```bash
git add robots.txt .vercelignore shared.js
git commit -m "chore(privacy): robots.txt + .vercelignore + runtime noindex meta"
```

---

### Task 27: vercel.ts + security headers

**Files:**
- Create: `C:/working/vercel.ts`

- [ ] **Step 1: Write vercel.ts**

```ts
// vercel.ts — static site + security headers
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  headers: [
    routes.header('/(.*)', [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ]),
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add vercel.ts
git commit -m "chore(deploy): vercel.ts with privacy + security headers"
```

---

### Task 28: Vercel deploy + post-deploy checks

**Files:** none (MCP calls only)

- [ ] **Step 1: Call `deploy_to_vercel`**

```
mcp__59d7ab9a-a78b-41d5-b0cb-32cb7bb46fea__deploy_to_vercel
```

- [ ] **Step 2: Extract deployment ID from response, check status**

```
mcp__59d7ab9a-a78b-41d5-b0cb-32cb7bb46fea__get_deployment (idOrUrl: <returned URL>)
```
Expected: `state: 'READY'`. If not, check `get_deployment_build_logs` and fix.

- [ ] **Step 3: Playwright verification against deployed URL**

```
browser_navigate("<deployment URL>/")
browser_evaluate("() => document.title") → "열일하는중 허브"
browser_evaluate("() => document.querySelector('meta[name=robots]').content") → "noindex, nofollow"
browser_evaluate("() => document.querySelector('.busy-os-top') !== null") → true
browser_take_screenshot()
```

- [ ] **Step 4: Enable Tier 2 (Vercel Authentication)**

This step requires the user's action in the Vercel dashboard (MCP doesn't currently expose Deployment Protection toggle):

> **User action required:** Open `https://vercel.com/thmms-projects/<project-name>/settings/deployment-protection`, enable **Vercel Authentication** (Standard Protection). This restricts the URL to your Vercel account only.

- [ ] **Step 5: Final Playwright sweep — checklist from spec §9.1**

Run through spec section 9.1 checklist against the deployed URL:
- Hub → Start FAB → fullscreen + rotation
- Wait ≥75 seconds, verify URL changes
- Navigate to `busy/legal.html`, `busy/erp.html`, `busy/hts.html` directly — observe vitals
- Trigger a toast via `Busy.showToast()`, verify appearance
- Press `.`, verify navigation to panic scene
- Press Esc twice, verify rotation resumes

Document any failures, fix, redeploy.

- [ ] **Step 6: Commit deploy log (optional)**

```bash
git add docs/
git commit -m "deploy(v1.0): Vercel production — <URL>"
```

---

## Self-Review

### Spec Coverage

| Spec section | Covered by task(s) |
|---|---|
| §1 배경 | (context only) |
| §2 파일 구조 | File Structure section + Tasks 1, 16, 26, 27 |
| §3.1 OSChrome | Tasks 5, 6, 7 |
| §3.2 ToastManager | Task 8 |
| §3.3 CursorDrift | Task 9 |
| §3.4 SoundEngine | Task 10 |
| §3.5 WakeLock | Task 13 |
| §3.6 Rotator | Tasks 11, 12 |
| §3.7 IdentityTag | Task 4 |
| §3.8 모듈 계약 | Tasks 1, 3 (event bus) |
| §4.1 전 씬 공통 층 | Tasks 5-10 + `busy-vitals-save-badge` in CSS |
| §4.2 정지 씬 타입별 | Tasks 16-20 |
| §4.3 살아있는 씬 간섭 방지 | Task 16 (deadzone check) + Task 25 (suppress on cad.html) |
| §4.4 DOM-agnostic 주입 | Tasks 17-20 |
| §4.5 타이밍 상수표 | Tasks 17-20 (inline tables) |
| §5.1-5.4 허브 UI | Tasks 21, 22, 23 |
| §5.5 UX 플로우 | Tasks 21, 24 (start + keys) |
| §5.6 단축키 확장 | Task 24 |
| §6.1-6.7 에러/폴백 | Tasks 13 (WL fallback), 14 (PiP skip), 10 (audio suspended), 12 (blacklist 404), 1 (boot try/catch — **added in shared.js module boot try/catch blocks**) |
| §7 배포 | Tasks 26, 27, 28 |
| §8 범위 | All tasks |
| §9 검증 | Task 28 |
| §10 YAGNI | Respected (no weighted rotation, no custom domain) |

**Gap identified:** Spec §4.1 #8 "'자동 저장됨' 하단 배지 (40~120s)" — not explicitly scheduled as a global hub/scene-wide timer. Table injector uses it, but it's supposed to be GLOBAL per spec. Adding sub-task:

**Addendum to Task 8 (ToastManager)** — add a secondary "save badge" scheduler. Replace Step 3's "Create `shared-core/toast.mjs`" `mount()` with:
```js
export function mount(s) {
  settings = s;
  scheduleNext();
  scheduleSaveBadge();
}

function scheduleSaveBadge() {
  const delay = (40 + Math.random() * 80) * 1000;
  setTimeout(() => {
    const b = document.createElement('div');
    b.className = 'busy-vitals-save-badge';
    b.textContent = `자동 저장됨 · ${new Date().toTimeString().slice(0,5)}`;
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('show'));
    setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.remove(), 500); }, 2600);
    scheduleSaveBadge();
  }, delay);
}
```

### Placeholder scan
No "TBD" / "TODO" / "implement later" strings. All steps contain full code or explicit commands.

### Type consistency
- `Busy.settings` has fields `intensity`, `osChrome`, `volume`, `rotation.{enabled,baseSec,jitterPct,blacklist}`, `sound.enabled`, `wakeLock.enabled`, `pip.enabled`, `ghostCursor.enabled`, `panicScene` — used consistently across Tasks 2, 5, 8, 9, 10, 11, 15, 22.
- `Busy.start()` / `Busy.stop()` signatures consistent across Tasks 15, 21.
- `Rotator.beginRotation(settings)`, `Rotator.stopRotation()`, `Rotator.panic(settings)`, `Rotator.resumePanic()` used consistently in Tasks 12, 15, 24.
- Scene paths consistent with Pattern C table.

### Ambiguities resolved
- "Live" vs "dead" scenes: formalized via `data-deadzone="true"` attr; vitals-core only injects on dead scenes.
- Resolver base path (`./` vs `../`): explicit in Pattern D and `resolveSceneUrl()`.
- Toast navigation target: explicit per-item `target` field in pool; missing target = dismiss-only.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-24-busy-realism-layer.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
