import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FULL_HIKE, streakGrid } from './streakGrid.ts';
import type { GoalTrail } from './weeklyGoal.ts';

// Wednesday 2026-11-04, local time.
const WED = new Date('2026-11-04T12:00:00');

const trails: Record<string, GoalTrail> = {
  big: { distance_km: 2, elevation_gain_m: 400 },
  long: { distance_km: 10, elevation_gain_m: 50 },
  short: { distance_km: 2, elevation_gain_m: 50 },
  none: { distance_km: null, elevation_gain_m: null },
};
const trailOf = (id: string) => trails[id];

describe('streakGrid', () => {
  it('is 12 weeks of 7 days, all zero when empty', () => {
    const grid = streakGrid([], trailOf, WED);
    assert.equal(grid.length, 12);
    assert.ok(grid.every((week) => week.length === 7 && week.every((d) => d === 0)));
    assert.equal(streakGrid([], trailOf, WED, 4).length, 4);
  });

  it('levels by climb or distance, newest week last, Monday first', () => {
    const grid = streakGrid(
      [
        { trail_id: 'big', created_at: '2026-11-02T09:00:00' },
        { trail_id: 'long', created_at: '2026-11-03T09:00:00' },
        { trail_id: 'short', created_at: '2026-11-04T09:00:00' },
        { trail_id: 'none', created_at: '2026-10-28T09:00:00' },
      ],
      trailOf,
      WED,
    );
    assert.deepEqual(grid[11], [2, 2, 1, 0, 0, 0, 0]);
    assert.deepEqual(grid[10], [0, 0, 1, 0, 0, 0, 0]);
  });

  it('uses the thresholds inclusively, and the log value over the trail', () => {
    assert.deepEqual(FULL_HIKE, { gainM: 305, distanceKm: 8.05 });
    const grid = streakGrid(
      [
        { trail_id: 'short', created_at: '2026-11-02T09:00:00', elevation_gain_m: 305 },
        { trail_id: 'short', created_at: '2026-11-03T09:00:00', distance_km: 8.05 },
        { trail_id: 'big', created_at: '2026-11-04T09:00:00', elevation_gain_m: 100, distance_km: 1 },
      ],
      trailOf,
      WED,
    );
    assert.deepEqual(grid[11].slice(0, 3), [2, 2, 1]);
  });

  it('keeps the higher level when two hikes share a day', () => {
    const logs = [
      { trail_id: 'big', created_at: '2026-11-03T07:00:00' },
      { trail_id: 'short', created_at: '2026-11-03T18:00:00' },
    ];
    assert.equal(streakGrid(logs, trailOf, WED)[11][1], 2);
    assert.equal(streakGrid([...logs].reverse(), trailOf, WED)[11][1], 2);
  });

  it('puts Sunday 23:30 in that week column 6', () => {
    const grid = streakGrid([{ trail_id: 'short', created_at: '2026-11-01T23:30:00' }], trailOf, WED);
    assert.equal(grid[10][6], 1);
    assert.equal(grid[11][0], 0);
  });

  it('ignores future, unparseable and older-than-12-weeks logs', () => {
    const grid = streakGrid(
      [
        { trail_id: 'big', created_at: '2026-11-05T10:00:00' },
        { trail_id: 'big', created_at: 'nope' },
        { trail_id: 'big', created_at: '2026-08-16T10:00:00' }, // week before the oldest
        { trail_id: 'big', created_at: '2026-08-17T10:00:00' }, // oldest week, Monday
      ],
      trailOf,
      WED,
    );
    assert.deepEqual(grid[0], [2, 0, 0, 0, 0, 0, 0]);
    assert.equal(grid.flat().filter((d) => d > 0).length, 1);
  });
});
