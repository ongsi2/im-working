import { test } from 'node:test';
import assert from 'node:assert';

// Stub a minimal localStorage for Node test env
globalThis.localStorage = (() => {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
})();

const { load, save, reset, defaults } = await import('../shared-core/settings.mjs');

test('defaults: intensity=med, rotation.enabled=false', () => {
  localStorage.clear();
  const s = load();
  assert.strictEqual(s.intensity, 'med');
  assert.strictEqual(s.rotation.enabled, false);
  assert.strictEqual(s.sound.enabled, true);
  assert.strictEqual(s.osChrome, 'mac');
  assert.strictEqual(s.panicScene, 'busy/email.html');
});

test('save/load round trip', () => {
  localStorage.clear();
  const s = load();
  s.intensity = 'high';
  s.rotation.baseSec = 35;
  save(s);
  const s2 = load();
  assert.strictEqual(s2.intensity, 'high');
  assert.strictEqual(s2.rotation.baseSec, 35);
});

test('reset clears and restores defaults', () => {
  const s = load();
  s.intensity = 'high';
  save(s);
  reset();
  assert.strictEqual(load().intensity, 'med');
});

test('partial stored data merges with defaults (forward-compat)', () => {
  localStorage.clear();
  localStorage.setItem('busy.settings', JSON.stringify({ intensity: 'low' }));
  const s = load();
  assert.strictEqual(s.intensity, 'low');
  assert.strictEqual(s.rotation.enabled, false); // default still present
});
