// shared.js — realism layer entry point

// Inject noindex meta at runtime so we don't edit 25 files
(function() {
  const m = document.createElement('meta');
  m.name = 'robots';
  m.content = 'noindex, nofollow';
  document.head.appendChild(m);
})();

import { emit, on } from './shared-core/eventbus.mjs';
import { load as loadSettings } from './shared-core/settings.mjs';
import { mount as mountIdentity } from './shared-core/identity-tag.mjs';
import { mount as mountOSChrome } from './shared-core/os-chrome.mjs';
import { mount as mountToast, show as showToast } from './shared-core/toast.mjs';
import { mount as mountCursor } from './shared-core/cursor.mjs';
import { mount as mountCursorActions } from './shared-core/cursor-actions.mjs';
import { mount as mountSound, unlock as unlockSound } from './shared-core/sound.mjs';
import * as Rotator from './shared-core/rotator.mjs';
import * as WakeLock from './shared-core/wake-lock.mjs';
import * as PiP from './shared-core/pip.mjs';
import * as Start from './shared-core/start.mjs';
import { mountVitals } from './shared-vitals.js';
import { mount as mountKeys } from './shared-core/keys.mjs';
import { mount as mountFirstHint } from './shared-core/first-visit-hint.mjs';
import { mount as mountFakeShortcuts } from './shared-core/fake-shortcuts.mjs';

// Global namespace
const Busy = {
  VERSION: '0.1.0',
  emit,
  on,
  state: {},        // runtime state bucket written by individual modules
  settings: null,   // populated by settings.mjs in Task 2
};
window.Busy = Busy;
Busy.settings = loadSettings();
console.info(`[Busy] shared.js v${Busy.VERSION} boot`);
console.info(`[Busy] settings loaded · intensity=${Busy.settings.intensity}`);
try { mountIdentity(); } catch (e) { console.warn('[Busy] IdentityTag failed', e); }
try { mountOSChrome(Busy.settings); } catch (e) { console.warn('[Busy] OSChrome failed', e); }
try { mountToast(Busy.settings); } catch (e) { console.warn('[Busy] Toast failed', e); }
Busy.showToast = showToast;
try { mountCursor(Busy.settings); } catch (e) { console.warn('[Busy] Cursor failed', e); }
try { mountCursorActions(); } catch (e) { console.warn('[Busy] CursorActions failed', e); }
try { mountSound(Busy.settings); } catch (e) { console.warn('[Busy] Sound failed', e); }
Busy.unlockSound = unlockSound;
try { Rotator.mount(Busy.settings); } catch (e) { console.warn('[Busy] Rotator failed', e); }
Busy.Rotator = Rotator;
try { WakeLock.mount(); } catch (e) { console.warn('[Busy] WakeLock failed', e); }
Busy.WakeLock = WakeLock;
Busy.PiP = PiP;
Busy.start = () => Start.startEverything(Busy.settings);
Busy.stop  = () => Start.stopEverything();
Busy.startTour = (role, intervalSec) => Start.startTour(role, intervalSec);
Busy.endTour = () => Start.endTour();
try { mountVitals(Busy.settings); } catch (e) { console.warn('[Busy] vitals failed', e); }
try { mountKeys(Busy.settings); } catch (e) { console.warn('[Busy] Keys failed', e); }
try { mountFirstHint(); } catch (e) { console.warn('[Busy] FirstHint failed', e); }
try { mountFakeShortcuts(); } catch (e) { console.warn('[Busy] FakeShortcuts failed', e); }
