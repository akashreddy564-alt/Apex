import assert from 'node:assert/strict';
import { test } from 'node:test';

import { projectPoints } from './projectPath.ts';

test('compare-card projection drops non-finite coordinates', () => {
  const points = projectPoints(
    [
      [Number.NaN, 37.7],
      [-122.4, 37.7],
      [-122.5, Number.NaN],
      [-122.41, 37.71],
    ],
    120,
    120,
    8,
  );
  assert.equal(points.length, 2);
  assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
