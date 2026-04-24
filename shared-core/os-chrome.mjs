// shared-core/os-chrome.mjs — fixed top bar + bottom dock
// Responsibilities: visually frame the page to look like a native OS,
// surface clock/battery/wifi/dock widgets, drive subtle ambient changes.

let topEl = null;
let dockEl = null;
let clockTimer = null;
let battTimer = null;
let wifiTimer = null;
let dockTimer = null;
let battPct = 100;

const DOCK_APPS = [
  { icon: '💬', name: 'Slack' },
  { icon: '📧', name: 'Mail' },
  { icon: '📝', name: 'Notion' },
  { icon: '📊', name: 'Excel' },
  { icon: '🌐', name: 'Chrome' },
  { icon: '💻', name: 'Terminal' },
];

function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }

function renderTop(el, skin) {
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

function tickClock() {
  if (!topEl) return;
  topEl.querySelector('[data-role="clock"]').textContent = fmtTime(new Date());
}

function tickBattery() {
  if (!topEl) return;
  battPct = Math.max(3, battPct - 1);
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
}

export function mount(settings) {
  if (settings.osChrome === 'off') return;

  // Top bar
  topEl = document.createElement('div');
  topEl.className = 'busy-os-top';
  renderTop(topEl, settings.osChrome);
  document.body.appendChild(topEl);
  document.body.classList.add('busy-has-chrome');

  const appName = document.body.dataset.title || document.title;
  topEl.querySelector('[data-role="app-name"]').textContent = appName;

  tickClock();
  clockTimer = setInterval(tickClock, 1000);

  battPct = 85 + Math.floor(Math.random() * 15);
  tickBattery();
  battTimer = setInterval(tickBattery, 60 * 1000);

  scheduleWifiFlicker();

  // Dock
  mountDock(settings.osChrome);
}

export function unmount() {
  if (clockTimer) clearInterval(clockTimer);
  if (battTimer) clearInterval(battTimer);
  if (wifiTimer) clearTimeout(wifiTimer);
  if (dockTimer) clearTimeout(dockTimer);
  topEl?.remove(); topEl = null;
  dockEl?.remove(); dockEl = null;
  document.body.classList.remove('busy-has-chrome', 'busy-has-dock');
}
