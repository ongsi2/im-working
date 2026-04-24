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
