// shared-vitals.js — imports each injector and dispatches by body.data-vitals-type.
// Must be imported by shared.js (same entry), not a separate <script> tag — keeps wiring simple.

import { mount as mountDocument } from './shared-core/vitals-document.mjs';
import { mount as mountTable }    from './shared-core/vitals-table.mjs';
import { mount as mountDashboard }from './shared-core/vitals-dashboard.mjs';
import { mount as mountTool }     from './shared-core/vitals-tool.mjs';

const DISPATCH = {
  document: mountDocument,
  table: mountTable,
  dashboard: mountDashboard,
  tool: mountTool,
};

export function mountVitals(settings) {
  const isDead = document.body.dataset.deadzone === 'true';
  if (!isDead) return;
  const type = document.body.dataset.vitalsType;
  const fn = DISPATCH[type];
  if (fn) fn(settings);
  else console.warn('[Busy] unknown vitals-type:', type);
}
