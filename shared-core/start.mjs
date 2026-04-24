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

  // Rotation
  settings.rotation.enabled = true;
  saveSettings(settings);
  Rotator.beginRotation(settings);
  results.rotation = true;

  console.info('[Busy] started', results);
  return results;
}

export async function stopEverything() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); } catch {}
  try { await PiP.exit(); } catch {}
  WakeLock.release();
  Rotator.stopRotation();
}
