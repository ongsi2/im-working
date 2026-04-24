// tests/vitals-core.test.mjs
import { test } from 'node:test';
import assert from 'node:assert';
import { pickIntensityRange, randRange } from '../shared-core/vitals-core.mjs';

test('pickIntensityRange: returns table entry by intensity', () => {
  const table = { low: [10,20], med: [5,10], high: [1,3] };
  assert.deepStrictEqual(pickIntensityRange(table, 'low'), [10,20]);
  assert.deepStrictEqual(pickIntensityRange(table, 'high'), [1,3]);
  assert.deepStrictEqual(pickIntensityRange(table, 'xxx'), [5,10]); // med fallback
});

test('randRange: within bounds', () => {
  for (let i = 0; i < 100; i++) {
    const v = randRange(5, 10);
    assert.ok(v >= 5 && v < 10);
  }
});
