// shared-core/os-chrome.mjs — fixed top bar + bottom dock
// Responsibilities: visually frame the page to look like a native OS,
// surface clock/battery/wifi/dock widgets, drive subtle ambient changes.

let topEl = null;
let dockEl = null;
let clockTimer = null;
let battTimer = null;
let wifiTimer = null;
let dockTimer = null;
let rotationTimer = null;
let battPct = 100;

const DOCK_APPS = [
  { icon: '💬', name: 'Slack' },
  { icon: '📧', name: 'Mail' },
  { icon: '📝', name: 'Notion' },
  { icon: '📊', name: 'Excel' },
  { icon: '🌐', name: 'Chrome' },
  { icon: '💻', name: 'Terminal' },
];

const APP_TO_DOCK_INDEX = {
  Slack: 0, Mail: 1, Notion: 2, Excel: 3, Chrome: 4, Terminal: 5,
  // Aliases — map other scene apps to the closest dock app
  'Jira': 4,        // Chrome (it's a web app)
  'Figma': 4,       // Chrome
  'Keynote': 2,     // Notion-ish (presentation)
  'Calendar': 1,    // Mail (often bundled)
  'Bloomberg': 4,   // Chrome
  'Binance': 4,     // Chrome
  'Lens': 5,        // Terminal
  'Final Cut': 2,   // Notion (creative tool placeholder)
  'AutoCAD': 2,
  'Word': 2,
  'EMR': 4,
  'memoQ': 2,
  'Overleaf': 4,
  'Jupyter': 5,
  'SAP': 4,
  'WMS': 4,
  'ATC': 5,
  'SIEM': 5,
  'HTS': 4,
  'Logic Pro': 2,
  'Blender': 2,
};

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function renderTop(el, skin) {
  el.dataset.skin = skin;
  el.innerHTML = `
    <div class="left">
      <span class="logo"></span>
      <span class="app-name" data-role="app-name" style="font-weight:600;"></span>
      <span class="doc-name" data-role="doc-name" style="opacity:0.55;"></span>
    </div>
    <div class="right">
      <span class="dnd" title="방해 금지">🌙</span>
      <span class="wifi" title="Wi-Fi">📶</span>
      <span class="battery" title="배터리"><span data-role="batt-pct">100</span>%</span>
      <span class="rotation" data-role="rotation" style="display:none;font-variant-numeric:tabular-nums;opacity:0.7;"></span>
      <span class="clock" data-role="clock">00:00</span>
    </div>
  `;
}

function tickClock() {
  if (!topEl) return;
  topEl.querySelector('[data-role="clock"]').textContent = fmtTime(new Date());
}

function tickRotation() {
  if (!topEl) return;
  const span = topEl.querySelector('[data-role="rotation"]');
  let state = null;
  try { state = JSON.parse(sessionStorage.getItem('busy.rotation') || 'null'); } catch {}
  if (!state?.enabled || !state.nextAt) {
    span.style.display = 'none'; return;
  }
  const left = Math.max(0, state.nextAt - Date.now());
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  span.textContent = `⟳ ${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  span.style.display = '';
}

// Battery model — persist across scene loads + realistic drain rate.
// Drain: ~1% per 5 min (= ~12%/h, similar to real laptops).
// Starting %: time-of-day aware. Workday morning = high (90~99%),
// late afternoon = mid (50~75%), evening/night = lower (30~55%).
const BATT_KEY = 'busy.battery';

function startingBatteryPct() {
  const h = new Date().getHours();
  if (h >= 8 && h < 12)  return 90 + Math.floor(Math.random() * 10);   // morning 90~99
  if (h >= 12 && h < 17) return 65 + Math.floor(Math.random() * 25);   // mid-day 65~89
  if (h >= 17 && h < 22) return 35 + Math.floor(Math.random() * 25);   // evening 35~59
  return 25 + Math.floor(Math.random() * 30);                          // night/early 25~54
}

function loadBattery() {
  try {
    const raw = sessionStorage.getItem(BATT_KEY);
    if (raw) {
      const v = parseInt(raw, 10);
      if (!isNaN(v) && v >= 1 && v <= 100) return v;
    }
  } catch {}
  return startingBatteryPct();
}

function saveBattery(v) {
  try { sessionStorage.setItem(BATT_KEY, String(v)); } catch {}
}

function tickBattery() {
  if (!topEl) return;
  battPct = Math.max(3, battPct - 1);
  saveBattery(battPct);
  topEl.querySelector('[data-role="batt-pct"]').textContent = String(battPct);
  if (battPct <= 15) {
    const el = topEl.querySelector('.battery');
    el.title = '충전 중';
    el.style.color = '#ffb020';
  }
}

function scheduleWifiFlicker() {
  if (!topEl) return;
  const delay = (2 + Math.random() * 8) * 60 * 1000;
  wifiTimer = setTimeout(() => {
    const wifi = topEl?.querySelector('.wifi');
    if (wifi) {
      wifi.classList.add('flicker');
      setTimeout(() => wifi.classList.remove('flicker'), 600);
    }
    scheduleWifiFlicker();
  }, delay);
}

function mountDock(skin) {
  dockEl = document.createElement('div');
  dockEl.className = 'busy-os-dock';
  dockEl.dataset.skin = skin;
  dockEl.innerHTML = DOCK_APPS.map((a, i) =>
    `<div class="dock-app" data-idx="${i}" title="${a.name}">${a.icon}<span class="dot"></span></div>`
  ).join('');
  document.body.appendChild(dockEl);
  document.body.classList.add('busy-has-dock');

  const scheduleDock = () => {
    const wait = 30_000 + Math.random() * 90_000;
    dockTimer = setTimeout(() => {
      if (!dockEl) return;
      const dots = dockEl.querySelectorAll('.dot');
      const idx = Math.floor(Math.random() * dots.length);
      dots[idx].classList.toggle('on');
      scheduleDock();
    }, wait);
  };
  scheduleDock();

  const currentApp = document.body.dataset.app;
  if (currentApp && APP_TO_DOCK_INDEX[currentApp] !== undefined) {
    const idx = APP_TO_DOCK_INDEX[currentApp];
    const target = dockEl.querySelector(`.dock-app[data-idx="${idx}"]`);
    if (target) target.classList.add('active');
  }
}

export function mount(settings) {
  if (settings.osChrome === 'off') return;

  // Top bar
  topEl = document.createElement('div');
  topEl.className = 'busy-os-top';
  renderTop(topEl, settings.osChrome);
  document.body.appendChild(topEl);
  document.body.classList.add('busy-has-chrome');

  const appName = document.body.dataset.app || document.body.dataset.title || document.title;
  topEl.querySelector('[data-role="app-name"]').textContent = appName;

  const docName = document.body.dataset.title || '';
  topEl.querySelector('[data-role="doc-name"]').textContent = docName !== appName ? docName : '';

  tickClock();
  clockTimer = setInterval(tickClock, 1000);

  tickRotation();
  rotationTimer = setInterval(tickRotation, 1000);

  battPct = loadBattery();
  topEl.querySelector('[data-role="batt-pct"]').textContent = String(battPct);
  if (battPct <= 15) {
    const el = topEl.querySelector('.battery');
    el.title = '충전 중'; el.style.color = '#ffb020';
  }
  // Slow drain: 1% per 5 minutes (~12%/h, realistic).
  battTimer = setInterval(tickBattery, 5 * 60 * 1000);

  scheduleWifiFlicker();

  // Dock
  mountDock(settings.osChrome);
}

export function unmount() {
  if (clockTimer) clearInterval(clockTimer);
  if (battTimer) clearInterval(battTimer);
  if (wifiTimer) clearTimeout(wifiTimer);
  if (dockTimer) clearTimeout(dockTimer);
  if (rotationTimer) clearInterval(rotationTimer);
  topEl?.remove(); topEl = null;
  dockEl?.remove(); dockEl = null;
  document.body.classList.remove('busy-has-chrome', 'busy-has-dock');
}
