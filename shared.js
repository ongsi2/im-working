// shared.js — realism layer entry point

import { emit, on } from './shared-core/eventbus.mjs';
import { load as loadSettings } from './shared-core/settings.mjs';

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
