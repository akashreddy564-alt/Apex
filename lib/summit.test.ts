import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bearing,
  compassPoint,
  dayNumber,
  hintFor,
  milesBetween,
  PLACE_COORDS,
  placeFor,
  reveal,
  shareLine,
  stateOf,
  streakFrom,
  type SummitPlace,
} from './summit.ts';

const places: SummitPlace[] = Object.keys(PLACE_COORDS).map((id, i) => ({
  id,
  name: id,
  elevationM: 1000 + i * 100,
  region: 'r',
  country: i < 5 ? 'USA' : 'Elsewhere',
}));

test('every place has coordinates', () => {
  assert.equal(Object.keys(PLACE_COORDS).length, 23);
  for (const [lat, lon] of Object.values(PLACE_COORDS)) {
    assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
  }
});

test('the same day gives the same place, and every place comes once per pass', () => {
  assert.equal(placeFor('2026-11-27', places).id, placeFor('2026-11-27', places).id);
  const start = 23 * 4; // a whole pass
  const seen = new Set<string>();
  for (let i = 0; i < 23; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + start + i));
    const key = d.toISOString().slice(0, 10);
    seen.add(placeFor(key, places).id);
  }
  assert.equal(seen.size, 23);
});

test('dayNumber counts calendar days', () => {
  assert.equal(dayNumber('2026-01-01'), 0);
  assert.equal(dayNumber('2026-03-09'), 67);
});

test('distance and direction are right for known pairs', () => {
  const everest = PLACE_COORDS['mount-everest']!;
  const k2 = PLACE_COORDS.k2!;
  const miles = milesBetween(everest, k2);
  assert.ok(miles > 800 && miles < 900, `Everest to K2 ${miles}`);
  assert.equal(compassPoint(bearing(everest, k2)), 'NW');
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(359), 'N');
  assert.equal(compassPoint(135), 'SE');
});

test('hints point from the guess toward the answer', () => {
  const rainier: SummitPlace = { id: 'mount-rainier', name: 'Rainier', elevationM: 4392, region: '', country: 'USA' };
  const whitney: SummitPlace = { id: 'mount-whitney', name: 'Whitney', elevationM: 4421, region: '', country: 'USA' };
  const h = hintFor(rainier, whitney);
  assert.equal(h.correct, false);
  assert.equal(h.elevationFt, 95);
  assert.equal(h.direction, 'S');
  assert.ok(h.sameCountry);
  assert.equal(hintFor(whitney, whitney).correct, true);
});

test('the photo opens up with each wrong guess and fully when finished', () => {
  assert.ok(reveal(0, false).scale > reveal(3, false).scale);
  assert.ok(reveal(0, false).blur > reveal(5, false).blur);
  assert.deepEqual(reveal(2, true), { scale: 1, blur: 0 });
});

test('game state and share line', () => {
  assert.equal(stateOf([], 'a'), 'playing');
  assert.equal(stateOf(['b', 'a'], 'a'), 'won');
  assert.equal(stateOf(['b', 'c', 'd', 'e', 'f', 'g'], 'a'), 'lost');
  assert.equal(shareLine('2026-01-03', ['b', 'a'], 'a'), 'Summit #3 · 2/6');
  assert.equal(shareLine('2026-01-03', ['b', 'c', 'd', 'e', 'f', 'g'], 'a'), 'Summit #3 · X/6');
});

test('streak counts back from today or yesterday', () => {
  assert.deepEqual(streakFrom(['2026-11-25', '2026-11-26', '2026-11-27'], '2026-11-27'), { current: 3, best: 3 });
  assert.deepEqual(streakFrom(['2026-11-25', '2026-11-26'], '2026-11-27'), { current: 2, best: 2 });
  assert.deepEqual(streakFrom(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-28'), { current: 0, best: 3 });
});
