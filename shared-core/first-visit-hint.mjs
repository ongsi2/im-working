// shared-core/first-visit-hint.mjs — first-visit shortcut hint banner.
// Shows once per session (sessionStorage flag) on the first non-hub scene
// the user lands on. Tells them about F (immersive), ? (cheatsheet), . (panic).

const SEEN_KEY = 'busy.hint.seen';

function isHub() {
  const p = location.pathname;
  return p === '/' || /\/index\.html$/.test(p) || /허브\.html$/.test(decodeURIComponent(p));
}

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}

function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch {}
}

export function mount() {
  if (isHub() || alreadySeen()) return;

  const el = document.createElement('div');
  el.className = 'busy-first-hint';
  el.innerHTML = `
    <span><kbd>F</kbd> 몰입모드</span>
    <span><kbd>?</kbd> 단축키</span>
    <span><kbd>.</kbd> 패닉</span>
    <span><kbd>H</kbd> 허브</span>
    <button class="hint-close" aria-label="닫기">×</button>
  `;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));

  const dismiss = () => {
    el.classList.remove('show');
    markSeen();
    setTimeout(() => el.remove(), 400);
  };

  el.querySelector('.hint-close').addEventListener('click', dismiss);
  // Auto-dismiss after 10s
  setTimeout(dismiss, 10_000);
  // Or dismiss on first relevant key
  const keyOnce = (e) => {
    if (['f', 'F', 'h', 'H', '?', '.'].includes(e.key)) {
      document.removeEventListener('keydown', keyOnce);
      dismiss();
    }
  };
  document.addEventListener('keydown', keyOnce);
}
