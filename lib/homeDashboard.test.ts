import test from 'node:test';
import assert from 'node:assert/strict';

import { topTrails, weekCard } from './homeDashboard.ts';

// Wednesday 2026-11-25, noon local: the week runs Mon Nov 23 to Sun Nov 29.
const NOW = new Date(2026, 10, 25, 12);
const day = (d: number) => new Date(2026, 10, d, 9).toISOString();
const noTrail = () => undefined;
const elevationGoal = { metric: 'elevation' as const, target: 914.4 };

const log = (created_at: string, elevation_gain_m: number | null, distance_km: number | null, trail_id = 't') => ({
  created_at,
  trail_id,
  elevation_gain_m,
  distance_km,
});

test('weekCard with no hikes is all zeros', () => {
  const card = weekCard([], noTrail, elevationGoal, NOW);
  assert.equal(card.metric, 'elevation');
  assert.equal(card.done, 0);
  assert.equal(card.hikes, 0);
  assert.equal(card.distanceKm, 0);
  assert.equal(card.percent, 0);
  assert.equal(card.streakWeeks, 0);
  assert.equal(card.target, 914.4);
});

test('weekCard sums this week and caps the percent at 100', () => {
  const logs = [log(day(23), 600, 3.0), log(day(24), 800, 3.5), log(day(25), 740, 3.3)];
  const card = weekCard(logs, noTrail, elevationGoal, NOW);
  assert.equal(card.done, 2140);
  assert.equal(card.hikes, 3);
  assert.ok(Math.abs(card.distanceKm - 9.8) < 1e-9);
  assert.equal(card.percent, 100);
  assert.equal(card.streakWeeks, 1);
});

test('weekCard rounds the percent', () => {
  const card = weekCard([log(day(24), 300, 2)], noTrail, elevationGoal, NOW);
  assert.equal(card.percent, 33);
});

test('a hike from last week does not count, but keeps the streak going', () => {
  const card = weekCard([log(day(18), 900, 5), log(day(24), 100, 1)], noTrail, elevationGoal, NOW);
  assert.equal(card.done, 100);
  assert.equal(card.hikes, 1);
  assert.equal(card.distanceKm, 1);
  assert.equal(card.streakWeeks, 2);
});

test('a hike without its own numbers falls back to the trail', () => {
  const trailOf = () => ({ distance_km: 4.2, elevation_gain_m: 410 });
  const card = weekCard([log(day(24), null, null)], trailOf, elevationGoal, NOW);
  assert.equal(card.done, 410);
  assert.equal(card.distanceKm, 4.2);
});

test('a distance goal counts kilometres', () => {
  const card = weekCard([log(day(24), 500, 6)], noTrail, { metric: 'distance', target: 16.09 }, NOW);
  assert.equal(card.metric, 'distance');
  assert.equal(card.done, 6);
  assert.equal(card.percent, 37);
});

const rank = (trail_id: string, score: number, position: string) => ({ trail_id, score, position });

test('topTrails returns the three best, best first', () => {
  const rows = [rank('a', 7.1, 'a2'), rank('b', 9.84, 'a0'), rank('c', 4.2, 'b0'), rank('d', 9.12, 'a1'), rank('e', 8.4, 'a3')];
  assert.deepEqual(
    topTrails(rows).map((r) => r.trail_id),
    ['b', 'd', 'e'],
  );
});

test('topTrails with fewer rankings returns what there is', () => {
  assert.deepEqual(topTrails([rank('a', 9, 'a0')]).map((r) => r.trail_id), ['a']);
  assert.deepEqual(topTrails([]), []);
});

test('topTrails takes a count', () => {
  const rows = [rank('a', 9, 'a0'), rank('b', 8, 'a1'), rank('c', 7, 'a2')];
  assert.equal(topTrails(rows, 2).length, 2);
});
