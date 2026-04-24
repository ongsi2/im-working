// shared.js — realism layer entry point

import { emit, on } from './shared-core/eventbus.mjs';

// Global namespace
const Busy = {
  VERSION: '0.1.0',
  emit,
  on,
  state: {},
  settings: null,   // populated by settings.mjs in Task 2
};
window.Busy = Busy;

console.info(`[Busy] shared.js v${Busy.VERSION} boot`);
