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
