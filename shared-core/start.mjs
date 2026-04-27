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

  // Rotation — only start if user explicitly enabled it in settings.
  // Default behavior: stay on whatever scene the user picked.
  if (settings.rotation.enabled) {
    Rotator.beginRotation(settings);
    results.rotation = true;
  } else {
    results.rotation = false;
  }

  console.info('[Busy] started', results);
  return results;
}

/** Activate immersive mode (FS + audio + WL) on the current scene without
 *  starting rotation. Called by `F` keypress from any scene. */
export async function focusCurrent(settings) {
  const results = {};
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    results.fullscreen = true;
  } catch { results.fullscreen = false; }
  try { await unlockSound(); results.audio = true; } catch { results.audio = false; }
  try { results.wakeLock = await WakeLock.request(); } catch { results.wakeLock = false; }
  console.info('[Busy] focus', results);
  return results;
}

export async function stopEverything() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  try { await PiP.exit(); } catch {}
  WakeLock.release();
  Rotator.stopRotation();
}

/** "샥샥 투어" — fast role-cycling demo mode. Click a role chip on the hub:
 *  fullscreen + audio + wake lock + PiP + immediately navigate to the first
 *  scene in that role with a 6s cycle. ESC exits. */
export async function startTour(role, intervalSec = 6) {
  const results = {};
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    results.fullscreen = true;
  } catch { results.fullscreen = false; }
  try { await unlockSound(); results.audio = true; } catch { results.audio = false; }
  try { results.wakeLock = await WakeLock.request(); } catch { results.wakeLock = false; }
  try { results.pip = await PiP.enter(); } catch { results.pip = false; }
  results.tour = Rotator.beginTour(role, intervalSec);
  console.info(`[Busy] tour started (${role}, ${intervalSec}s)`, results);
  return results;
}

/** End tour and return to hub. Caller is the keys.mjs Esc handler. */
export async function endTour() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  try { await PiP.exit(); } catch {}
  WakeLock.release();
  Rotator.stopTour();
  // Navigate back to hub
  const base = location.pathname.includes('/busy/') ? '../' : './';
  location.href = base + 'index.html';
}
