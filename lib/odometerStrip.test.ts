import test from 'node:test';
import assert from 'node:assert/strict';
import { rebase, rollTo } from './odometerStrip.ts';

test('5 to 4 rolls back one step', () => {
  const r = rollTo(5, 4);
  assert.equal(r.target - r.from, -1);
  assert.equal(r.target % 10, 4);
});

test('9 to 0 rolls forward one step and 0 to 9 back one', () => {
  assert.equal(rollTo(9, 0).target - rollTo(9, 0).from, 1);
  assert.equal(rollTo(10, 9).target - rollTo(10, 9).from, -1);
});

test('every move is at most 5 steps and stays inside the strip', () => {
  for (let pos = 0; pos < 20; pos++) {
    for (let digit = 0; digit < 10; digit++) {
      const r = rollTo(pos, digit);
      assert.ok(Math.abs(r.target - r.from) <= 5);
      assert.ok(r.target >= 0 && r.target <= 19);
      assert.equal(r.target % 10, digit);
      assert.equal(r.from % 10, pos % 10);
      assert.equal(Math.abs(r.shift % 10), 0);
    }
  }
});

test('rebase lands in [5, 14] on the same digit', () => {
  for (let pos = 0; pos < 20; pos++) {
    const r = rebase(pos);
    assert.ok(r.pos >= 5 && r.pos <= 14);
    assert.equal(r.pos % 10, pos % 10);
  }
});
