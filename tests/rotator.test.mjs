// tests/rotator.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';

const { shuffle, advance, buildOrder } = await import('../shared-core/rotator.mjs');

test('shuffle: same length, all unique', () => {
  const input = Array.from({length: 10}, (_, i) => `s${i}`);
  const out = shuffle(input, () => 0.5);
  assert.strictEqual(out.length, input.length);
  assert.strictEqual(new Set(out).size, input.length);
});

test('advance: cursor increments, nextAt moves forward with jitter', () => {
  const state = { order: ['a','b','c'], cursor: 0, baseSec: 60, jitterPct: 0, blacklist: [] };
  const r = advance(state, () => 0.5, 1_000_000);
  assert.strictEqual(r.state.cursor, 1);
  assert.strictEqual(r.state.order[r.state.cursor], 'b');
  // jitterPct=0 → nextAt exactly +60000
  assert.strictEqual(r.state.nextAt, 1_000_000 + 60_000);
  assert.strictEqual(r.nextPath, 'b');
});

test('advance: skips blacklisted', () => {
  const state = { order: ['a','b','c','d'], cursor: 0, baseSec: 60, jitterPct: 0, blacklist: ['b', 'c'] };
  const r = advance(state, () => 0.5, 0);
  assert.strictEqual(r.nextPath, 'd');
  assert.strictEqual(r.state.cursor, 3);
});

test('advance: wraps around cycle', () => {
  const state = { order: ['a','b'], cursor: 1, baseSec: 60, jitterPct: 0, blacklist: [] };
  const r = advance(state, () => 0.5, 0);
  assert.strictEqual(r.state.cursor, 0);
  assert.ok(r.nextPath === 'a' || r.nextPath === 'b');
});

test('buildOrder: excludes blacklisted', () => {
  const all = ['a','b','c','d'];
  const order = buildOrder(all, ['b'], () => 0.5);
  assert.strictEqual(order.includes('b'), false);
  assert.strictEqual(order.length, 3);
});

test('advance: jitter within expected range (20s floor not triggered)', () => {
  const state = { order: ['a','b'], cursor: 0, baseSec: 100, jitterPct: 0.25, blacklist: [] };
  const r = advance(state, () => 1, 1000);  // rand=1 → +jitter
  // formula: nextAt = now + max(20000, baseSec*1000 * (1 + (rand*2-1)*jitterPct))
  //   = 1000 + max(20000, 100000 * 1.25) = 1000 + 125000 = 126000
  assert.strictEqual(r.state.nextAt, 126000);
  const r2 = advance({...state, cursor: 0}, () => 0, 1000); // rand=0 → -jitter
  // = 1000 + max(20000, 100000 * 0.75) = 1000 + 75000 = 76000
  assert.strictEqual(r2.state.nextAt, 76000);
});
