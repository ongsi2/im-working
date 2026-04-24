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
