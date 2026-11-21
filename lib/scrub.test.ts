import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canScrub, routeFraction, scrubAt, ticksCrossed } from './scrub.ts';

const PROFILE = [
  { distance_m: 0, elevation_m: 1000 },
  { distance_m: 100, elevation_m: 1100 },
  { distance_m: 200, elevation_m: 1050 },
];

describe('canScrub', () => {
  it('needs at least two samples', () => {
    assert.equal(canScrub([]), false);
    assert.equal(canScrub([{ distance_m: 0 }]), false);
    assert.equal(canScrub([{ distance_m: 0 }, { distance_m: 10 }]), true);
  });
});

describe('scrubAt', () => {
  it('interpolates between samples and counts the partial climb', () => {
    assert.deepEqual(scrubAt(PROFILE, 0.25), { distanceM: 50, elevationM: 1050, climbedM: 50 });
  });

  it('does not count descents', () => {
    assert.equal(scrubAt(PROFILE, 1)?.climbedM, 100);
  });

  it('clamps the fraction to 0..1', () => {
    assert.deepEqual(scrubAt(PROFILE, -1), scrubAt(PROFILE, 0));
    assert.deepEqual(scrubAt(PROFILE, 2), scrubAt(PROFILE, 1));
  });

  it('returns null when the profile cannot be scrubbed', () => {
    assert.equal(scrubAt([], 0.5), null);
    assert.equal(scrubAt([PROFILE[0]], 0.5), null);
  });
});

describe('routeFraction', () => {
  it('folds out-and-back onto the way out', () => {
    assert.equal(routeFraction('out-and-back', 0.25), 0.5);
    assert.equal(routeFraction('out-and-back', 0.75), 0.5);
    assert.equal(routeFraction('out-and-back', 1), 0);
  });

  it('passes loops and unknown shapes through', () => {
    assert.equal(routeFraction('loop', 0.3), 0.3);
    assert.equal(routeFraction(null, 0.3), 0.3);
    assert.equal(routeFraction(undefined, 0.3), 0.3);
    assert.equal(routeFraction('point-to-point', 0.3), 0.3);
  });
});

describe('ticksCrossed', () => {
  it('counts 500 ft marks between two distances', () => {
    assert.equal(ticksCrossed(0, 400), 2);
    assert.equal(ticksCrossed(400, 0), 2);
    assert.equal(ticksCrossed(10, 20), 0);
  });
});
