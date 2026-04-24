import { test } from 'node:test';
import assert from 'node:assert';

// Minimal window stub
globalThis.window = globalThis.window || {
  _listeners: new Map(),
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type).add(fn);
  },
  removeEventListener(type, fn) {
    this._listeners.get(type)?.delete(fn);
  },
  dispatchEvent(evt) {
    this._listeners.get(evt.type)?.forEach((fn) => fn(evt));
    return true;
  },
};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };

const { emit, on } = await import('../shared-core/eventbus.mjs');

test('emit → subscribed listener fires with detail', () => {
  let got = null;
  on('toast', (d) => { got = d; });
  emit('toast', { text: 'hi' });
  assert.deepStrictEqual(got, { text: 'hi' });
});

test('on returns unsubscribe fn', () => {
  let count = 0;
  const off = on('ping', () => count++);
  emit('ping'); emit('ping');
  off();
  emit('ping');
  assert.strictEqual(count, 2);
});

test('multiple listeners all fire', () => {
  let a = 0, b = 0;
  on('fan', () => a++);
  on('fan', () => b++);
  emit('fan');
  assert.strictEqual(a, 1);
  assert.strictEqual(b, 1);
});
