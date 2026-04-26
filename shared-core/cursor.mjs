// shared-core/cursor.mjs — ghost cursor with dwell-travel state machine
//
// Motion model: human hand → cursor usually sits still, then occasionally
// makes a quick targeted move, then sits still again. No continuous drift.
//
// Phases:
//   dwell   — cursor sits still for 2-8s
//   travel  — ease-out move to a new target; duration scales with distance
//
// External coordination:
//   getPos()       — returns current cursor coords, used by vitals to bias
//                    flash/tick targets near the cursor (correlation realism)
//   reactTo(x,y,p) — interrupt current dwell with a forced travel toward (x,y)
//                    with probability p. Used when a toast appears so the
//                    cursor "responds" to the notification visually.
//
// When travel ends on a real DOM element, we emit `cursor:arrived` so
// shared-core/cursor-actions.mjs can simulate click/type/select/etc.

import { emit } from './eventbus.mjs';

const POS_KEY = 'busy.cursor';
function loadStoredPos() {
  try { return JSON.parse(sessionStorage.getItem(POS_KEY)) || null; } catch { return null; }
}
function saveStoredPos(x, y) {
  try { sessionStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch {}
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

// Module-scope state — exposed via getPos / reactTo
let el = null;
let raf = null;
let curX = 0, curY = 0;
let phase = 'dwell';
let phaseStart = 0;
let phaseDuration = 0;
let fromX = 0, fromY = 0, toX = 0, toY = 0;
let targetEl = null;
let forcedTarget = null;   // { x, y } — set by reactTo, consumed at next dwell→travel transition

function startDwell(ts) {
  phase = 'dwell';
  phaseStart = ts;
  phaseDuration = 2000 + Math.random() * 6000;
}

function startTravelTo(ts, tx, ty) {
  phase = 'travel';
  phaseStart = ts;
  fromX = curX; fromY = curY;
  toX = tx; toY = ty;
  targetEl = null;
  const d = Math.hypot(toX - fromX, toY - fromY);
  phaseDuration = Math.min(750, 160 + d * 1.1);
}

function startTravel(ts) {
  phase = 'travel';
  phaseStart = ts;
  fromX = curX; fromY = curY;
  targetEl = null;
  const W = window.innerWidth, H = window.innerHeight;
  const useElement = Math.random() < 0.4;
  if (useElement) {
    const targets = [...document.querySelectorAll('button, a, td, input, textarea, .cell, [class*="row"], [class*="item"], li')]
      .filter(el => {
        if (el.closest('.busy-os-top, .busy-os-dock, .busy-toast-container, .busy-settings-drawer, .busy-hub-fab, .busy-status-strip, .busy-fake-context-menu')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 8 && r.height > 8 && r.top >= 0 && r.left >= 0 && r.bottom <= H && r.right <= W;
      });
    if (targets.length > 0) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      targetEl = t;
      const r = t.getBoundingClientRect();
      toX = r.left + r.width * (0.3 + Math.random() * 0.4);
      toY = r.top + r.height * (0.3 + Math.random() * 0.4);
      const d = Math.hypot(toX - fromX, toY - fromY);
      phaseDuration = Math.min(750, 160 + d * 1.1);
      return;
    }
  }
  const isLong = Math.random() < 0.3;
  if (isLong) {
    toX = 40 + Math.random() * Math.max(0, W - 80);
    toY = 40 + Math.random() * Math.max(0, H - 80);
  } else {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 120;
    toX = clamp(curX + Math.cos(angle) * dist, 20, W - 20);
    toY = clamp(curY + Math.sin(angle) * dist, 20, H - 20);
  }
  const d = Math.hypot(toX - fromX, toY - fromY);
  phaseDuration = Math.min(750, 160 + d * 1.1);
}

function step(ts) {
  const elapsed = ts - phaseStart;

  if (elapsed >= phaseDuration) {
    if (phase === 'dwell') {
      if (forcedTarget) {
        startTravelTo(ts, forcedTarget.x, forcedTarget.y);
        forcedTarget = null;
      } else {
        startTravel(ts);
      }
    } else {
      curX = toX; curY = toY;
      if (targetEl) {
        try { emit('cursor:arrived', { element: targetEl, x: curX, y: curY }); } catch {}
        targetEl = null;
      }
      startDwell(ts);
    }
  } else if (phase === 'travel') {
    const t = elapsed / phaseDuration;
    const eased = easeOutCubic(t);
    curX = fromX + (toX - fromX) * eased;
    curY = fromY + (toY - fromY) * eased;
  }
  // dwell: cursor sits perfectly still — real mice don't drift when
  // your hand rests on them.
  el.style.transform = `translate(${curX}px, ${curY}px)`;
  saveStoredPos(curX, curY);

  raf = requestAnimationFrame(step);
}

export function mount(settings) {
  if (!settings.ghostCursor.enabled) return;
  if (document.body.dataset.suppress?.includes('cursor')) return;

  el = document.createElement('div');
  el.className = 'busy-ghost-cursor';
  document.body.appendChild(el);

  const stored = loadStoredPos();
  curX = stored?.x ?? window.innerWidth * 0.35;
  curY = stored?.y ?? window.innerHeight * 0.4;
  fromX = curX; fromY = curY; toX = curX; toY = curY;

  phase = 'dwell';
  phaseStart = performance.now();
  phaseDuration = 1500 + Math.random() * 3000;

  raf = requestAnimationFrame(step);
}

export function unmount() {
  if (raf) cancelAnimationFrame(raf);
  el?.remove();
  el = null;
}

/** Read cursor's current position (or null if cursor not mounted). */
export function getPos() {
  if (!el) return null;
  return { x: curX, y: curY };
}

/**
 * Interrupt the current dwell with a forced travel toward (x, y), with
 * probability `prob`. If the cursor is already traveling, the request is
 * dropped (no overriding mid-move). Used by toasts so the cursor reacts
 * to notifications appearing on screen.
 */
export function reactTo(x, y, prob = 0.5) {
  if (!el) return false;
  if (phase === 'travel') return false;
  if (Math.random() > prob) return false;
  // Add slight offset so cursor doesn't land exactly on the toast center
  const jitter = 12;
  forcedTarget = {
    x: x + (Math.random() * 2 - 1) * jitter,
    y: y + (Math.random() * 2 - 1) * jitter,
  };
  // Make current dwell expire immediately — next step() picks up forcedTarget
  phaseStart = performance.now() - phaseDuration - 1;
  return true;
}
