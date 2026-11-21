import test from 'node:test';
import assert from 'node:assert/strict';
import { contourPaths } from './contours.ts';

test('same seed gives the same paths', () => {
  assert.deepEqual(contourPaths('angels', 340, 360), contourPaths('angels', 340, 360));
});

test('a different seed gives different paths', () => {
  assert.notDeepEqual(contourPaths('angels', 340, 360), contourPaths('zion', 340, 360));
});

test('length equals rings, default 12', () => {
  assert.equal(contourPaths('a', 100, 100).length, 12);
  assert.equal(contourPaths('a', 100, 100, 5).length, 5);
});

test('every path is a closed loop', () => {
  for (const p of contourPaths('a', 200, 300, 8)) {
    assert.ok(p.startsWith('M'));
    assert.ok(p.endsWith('Z'));
  }
});
