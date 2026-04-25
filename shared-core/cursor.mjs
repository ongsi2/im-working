// shared-core/cursor.mjs — ghost cursor with dwell-travel state machine
//
// Motion model: human hand → cursor usually sits still, then occasionally
// makes a quick targeted move, then sits still again. No continuous drift.
//
// Phases:
//   dwell   — cursor sits ~still (micro tremor only) for 2-8s
//   travel  — ease-out move to a new target; duration scales with distance
//
// Two kinds of travel:
//   local  — 40~160px nearby motion (reading, hovering)
//   long   — anywhere on screen (switching attention)
// ~30% of travels are long, rest local.

let el = null;
let raf = null;

const POS_KEY = 'busy.cursor';
function loadPos() {
  try { return JSON.parse(sessionStorage.getItem(POS_KEY)) || null; } catch { return null; }
}
function savePos(x, y) {
  try { sessionStorage.setItem(POS_KEY, JSON.stringify({ x, y })); } catch {}
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

export function mount(settings) {
  if (!settings.ghostCursor.enabled) return;
  if (document.body.dataset.suppress?.includes('cursor')) return;

  el = document.createElement('div');
  el.className = 'busy-ghost-cursor';
  document.body.appendChild(el);

  const stored = loadPos();
  let curX = stored?.x ?? window.innerWidth * 0.35;
  let curY = stored?.y ?? window.innerHeight * 0.4;

  let phase = 'dwell';
  let phaseStart = performance.now();
  let phaseDuration = 1500 + Math.random() * 3000;  // first dwell short-ish
  let fromX = curX, fromY = curY, toX = curX, toY = curY;

  function startDwell(ts) {
    phase = 'dwell';
    phaseStart = ts;
    phaseDuration = 2000 + Math.random() * 6000;     // 2~8 s
  }

  function startTravel(ts) {
    phase = 'travel';
    phaseStart = ts;
    fromX = curX; fromY = curY;
    const W = window.innerWidth, H = window.innerHeight;
    const useElement = Math.random() < 0.4;
    if (useElement) {
      const targets = [...document.querySelectorAll('button, a, td, input, .cell, [class*="row"], [class*="item"], li')]
        .filter(el => {
          if (el.closest('.busy-os-top, .busy-os-dock, .busy-toast-container, .busy-settings-drawer, .busy-hub-fab, .busy-status-strip')) return false;
          const r = el.getBoundingClientRect();
          return r.width > 8 && r.height > 8 && r.top >= 0 && r.left >= 0 && r.bottom <= H && r.right <= W;
        });
      if (targets.length > 0) {
        const t = targets[Math.floor(Math.random() * targets.length)];
        const r = t.getBoundingClientRect();
        toX = r.left + r.width * (0.3 + Math.random() * 0.4);
        toY = r.top + r.height * (0.3 + Math.random() * 0.4);
        const d = Math.hypot(toX - fromX, toY - fromY);
        phaseDuration = Math.min(750, 160 + d * 1.1);
        return;
      }
      // fall through to random if no targets
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
    phaseDuration = Math.min(750, 160 + d * 1.1);     // hand-like speed
  }

  function step(ts) {
    const elapsed = ts - phaseStart;

    if (elapsed >= phaseDuration) {
      if (phase === 'dwell') {
        startTravel(ts);
      } else {
        curX = toX; curY = toY;
        startDwell(ts);
      }
    } else if (phase === 'travel') {
      const t = elapsed / phaseDuration;
      const eased = easeOutCubic(t);
      curX = fromX + (toX - fromX) * eased;
      curY = fromY + (toY - fromY) * eased;
    }
    // dwell: curX/curY stay put; tremor is visual only below

    let rx = curX, ry = curY;
    if (phase === 'dwell') {
      // micro tremor — tiny hand shake, not drift
      rx += Math.sin(ts * 0.004) * 0.7 + Math.sin(ts * 0.013) * 0.5;
      ry += Math.cos(ts * 0.0037) * 0.7 + Math.cos(ts * 0.012) * 0.5;
    }
    el.style.transform = `translate(${rx}px, ${ry}px)`;
    savePos(curX, curY);

    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
}

export function unmount() {
  if (raf) cancelAnimationFrame(raf);
  el?.remove();
  el = null;
}
