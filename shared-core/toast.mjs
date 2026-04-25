// shared-core/toast.mjs — show, queue, schedule
//
// Dual responsibility: (1) scheduler that randomly shows toasts based on
// settings.intensity, and (2) a "자동 저장됨" save-badge scheduler per
// spec §4.1 #8 (global ambient save badge independent of toasts).

import { emit } from './eventbus.mjs';
import { randomToast, randomToastInScenes } from './toast-pool.mjs';
import { ROLE_GROUPS } from './rotator.mjs';

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
let saveBadgeTimer = null;
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
    let toast;
    if (settings.rotation?.enabled && settings.rotation.role && settings.rotation.role !== 'mixed') {
      const allowed = ROLE_GROUPS[settings.rotation.role] || [];
      toast = randomToastInScenes(allowed);
    } else {
      toast = randomToast();
    }
    show(toast);
    scheduleNext();
  }, delaySec * 1000);
}

function isHub() {
  // Hub pages are index.html / 열일하는중 허브.html — both at root with no scene data-app
  const p = location.pathname;
  return p === '/' || /\/index\.html$/.test(p) || /허브\.html$/.test(decodeURIComponent(p));
}

function scheduleSaveBadge() {
  // Global "자동 저장됨" ambient badge per spec §4.1 #8.
  // Skip on hub — hub is a card grid, not a "document being saved".
  if (isHub()) return;
  const delay = (40 + Math.random() * 80) * 1000;
  saveBadgeTimer = setTimeout(() => {
    const b = document.createElement('div');
    b.className = 'busy-vitals-save-badge';
    b.textContent = `자동 저장됨 · ${new Date().toTimeString().slice(0, 5)}`;
    document.body.appendChild(b);
    requestAnimationFrame(() => b.classList.add('show'));
    setTimeout(() => {
      b.classList.remove('show');
      setTimeout(() => b.remove(), 500);
    }, 2600);
    scheduleSaveBadge();
  }, delay);
}

export function mount(s) {
  settings = s;
  scheduleNext();
  scheduleSaveBadge();
}

export function unmount() {
  if (scheduleTimer) clearTimeout(scheduleTimer);
  if (saveBadgeTimer) clearTimeout(saveBadgeTimer);
  container?.remove();
  container = null;
  queue = [];
  showing = 0;
}
