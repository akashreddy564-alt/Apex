import test from 'node:test';
import assert from 'node:assert/strict';
import { FPS, cueLabels, drawMs, shouldFly, flyoverPlan, planSeconds, trimEnds, type Coord } from './plan.ts';

const STATS = { name: 'Test Peak', distanceKm: 6, gainM: 600, durationSeconds: 7200 };

/** A straight line north from (-121, 47), `n` points `step` metres apart, climbing then descending. */
function route(n: number, step: number, withEle = true, peakAt = 0.5): Coord[] {
  const dLat = step / 111195;
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const ele = 500 + 600 * (1 - Math.abs(x - peakAt) / Math.max(peakAt, 1 - peakAt));
    return withEle ? [-121, 47 + i * dLat, ele] : [-121, 47 + i * dLat];
  });
}

const lengthOf = (coords: Coord[]) => (coords[coords.length - 1][1] - coords[0][1]) * 111195;

test('trimEnds removes 300 m from each end', () => {
  const trimmed = trimEnds(route(101, 30));
  assert.ok(trimmed);
  assert.ok(Math.abs(lengthOf(trimmed) - 2400) < 2);
  assert.ok(Math.abs((trimmed[0][1] - 47) * 111195 - 300) < 2);
});

test('trimEnds returns null for a route too short to hide its ends', () => {
  assert.equal(trimEnds(route(21, 35)), null); // 700 m
  assert.ok(trimEnds(route(21, 36))); // 720 m
});

test('trimEnds keeps elevations', () => {
  const trimmed = trimEnds(route(101, 30));
  assert.ok(trimmed && trimmed.every((c) => c.length === 3));
});

test('flyoverPlan is null with nothing to fly', () => {
  assert.equal(flyoverPlan([], STATS), null);
  assert.equal(flyoverPlan([[-121, 47]], STATS), null);
  assert.equal(flyoverPlan([[-121, 47], [-121, 47.0001]], STATS), null); // 11 m
  assert.equal(flyoverPlan([[NaN, 47], [-121, 47]], STATS), null);
});

test('points are evenly spaced and capped', () => {
  const plan = flyoverPlan(route(2000, 30), STATS);
  assert.ok(plan);
  assert.equal(plan.points.length, 600);
  assert.equal(plan.along[0], 0);
  assert.equal(plan.along[plan.along.length - 1], 1);
  const short = flyoverPlan(route(3, 50), STATS);
  assert.ok(short && short.points.length === 40);
});

test('cues draw the line forward and end on the whole route', () => {
  const plan = flyoverPlan(route(101, 60), STATS);
  assert.ok(plan);
  for (let i = 1; i < plan.cues.length; i++) assert.ok(plan.cues[i].a >= plan.cues[i - 1].a - 1e-9);
  const last = plan.cues[plan.cues.length - 1];
  assert.deepEqual([last.a, last.p], [1, 1]);
  assert.equal(last.km, 6);
  assert.equal(last.secs, 7200);
  assert.ok(Math.abs(last.gain - 600) < 1e-6);
});

test('it orbits at a high point partway along, with the line paused there', () => {
  const plan = flyoverPlan(route(101, 60, true, 0.5), STATS);
  assert.ok(plan);
  const orbit = plan.cues.filter((c) => c.o >= 0);
  assert.equal(orbit.length, 3 * FPS);
  const peakA = plan.along[plan.peak];
  assert.ok(Math.abs(peakA - 0.5) < 0.02);
  assert.ok(orbit.every((c) => Math.abs(c.a - peakA) < 1e-9));
  assert.ok(Math.abs(orbit[orbit.length - 1].o - 1) < 1e-9);
});

test('a summit at the end orbits after the draw', () => {
  const plan = flyoverPlan(route(101, 60, true, 1), STATS);
  assert.ok(plan);
  const orbit = plan.cues.filter((c) => c.o >= 0);
  assert.ok(orbit.length > 0 && orbit.every((c) => c.a === 1));
});

test('without elevations there is no orbit and gain counts evenly', () => {
  const plan = flyoverPlan(route(101, 60, false), STATS);
  assert.ok(plan);
  assert.equal(plan.peak, -1);
  assert.equal(plan.cues.filter((c) => c.o >= 0).length, 0);
  const mid = plan.cues.find((c) => c.a >= 0.5);
  assert.ok(mid && Math.abs(mid.gain / 600 - mid.a) < 1e-9);
});

test('gain counts up with the climb: all of it by the summit on an out-and-back', () => {
  const plan = flyoverPlan(route(101, 60, true, 0.5), STATS);
  assert.ok(plan);
  const atPeak = plan.cues.find((c) => c.o >= 0);
  assert.ok(atPeak && atPeak.gain > 590);
});

test('draw time grows with length within 7 to 15 s', () => {
  assert.equal(drawMs(100), 7000);
  assert.equal(drawMs(5000), 9500);
  assert.equal(drawMs(40000), 15000);
});

test('reduce motion holds the finished route with no camera moves', () => {
  const plan = flyoverPlan(route(101, 60), STATS, { reduceMotion: true });
  assert.ok(plan);
  assert.ok(plan.cues.every((c) => c.a === 1 && c.o === -1 && c.p === 1));
  assert.ok(planSeconds(plan) < 3);
});

test('bounds cover the route', () => {
  const plan = flyoverPlan(route(101, 60), STATS);
  assert.ok(plan);
  const [[w, s], [e, n]] = plan.bounds;
  assert.ok(w <= -121 && e >= -121 && s <= 47.0001 && n >= 47.05);
});

test('cueLabels prints miles, feet and time like the video', () => {
  assert.deepEqual(cueLabels({ km: 9.656, gain: 914.4, secs: 3 * 3600 + 5 * 60 }), { miles: '6.0', feet: '3,000', time: '3:05' });
  assert.deepEqual(cueLabels({ km: 20, gain: 0, secs: 45 * 60 }), { miles: '12', feet: '0', time: '45 min' });
});

test('shouldFly needs a route, a token and a connection', () => {
  const coords = route(5, 50);
  assert.equal(shouldFly({ coords, online: true, hasToken: true }), true);
  assert.equal(shouldFly({ coords, online: false, hasToken: true }), false);
  assert.equal(shouldFly({ coords, online: true, hasToken: false }), false);
  assert.equal(shouldFly({ coords: [[-121, 47]], online: true, hasToken: true }), false);
  assert.equal(shouldFly({ coords: null, online: true, hasToken: true }), false);
});

test('steepness stops run 0 to 1 along the route and rise where it climbs', () => {
  const plan = flyoverPlan(route(101, 30, true, 0.5), STATS);
  assert.ok(plan);
  assert.equal(plan.steep[0][0], 0);
  assert.equal(plan.steep[plan.steep.length - 1][0], 1);
  assert.ok(plan.steep.every(([, v]) => v >= 0 && v <= 1));
  assert.ok(plan.steep.some(([, v]) => v > 0.5));
  const flat = flyoverPlan(route(101, 30, false), STATS);
  assert.ok(flat && flat.steep.every(([, v]) => v === 0));
});
