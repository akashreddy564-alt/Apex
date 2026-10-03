import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyElevationUpdate,
  blendProfiles,
  clipWidth,
  planCountUp,
  type RevealState,
} from './elevationMotion.ts';
import type { ElevationSample } from '../types/trail.ts';

/**
 * Stand-in for the persisted trail list. A cache write replaces
 * `elevation_profile` with a new array and leaves the trail id alone.
 */
interface TrailCache {
  trails: { id: string; elevation_profile: ElevationSample[] }[];
}

function writeElevationProfile(
  cache: TrailCache,
  id: string,
  elevation_profile: ElevationSample[],
): TrailCache {
  return {
    trails: cache.trails.map((trail) =>
      trail.id === id ? { ...trail, elevation_profile } : trail,
    ),
  };
}

function readTrail(cache: TrailCache, id: string) {
  const trail = cache.trails.find((item) => item.id === id);
  if (!trail) throw new Error(`missing trail ${id}`);
  return trail;
}

const ORIGINAL: ElevationSample[] = [
  { distance_m: 0, elevation_m: 220 },
  { distance_m: 6200, elevation_m: 700 },
  { distance_m: 12400, elevation_m: 1173 },
];

describe('elevation reveal clip', () => {
  it('stays at full width when the open trail gets a new elevation_profile', () => {
    const chartWidth = 1150;
    let cache: TrailCache = {
      trails: [{ id: 'trail-diablo', elevation_profile: ORIGINAL }],
    };

    let state: RevealState = { trailId: null, reveal: 0, hapticIndex: 4 };
    const opened = readTrail(cache, 'trail-diablo');
    const opening = applyElevationUpdate(state, {
      trailId: opened.id,
      samplesChanged: true,
      reducedMotion: false,
    });
    assert.equal(opening.replay, true);
    assert.equal(opening.reveal, 0);
    assert.equal(opening.hapticIndex, null);
    assert.equal(clipWidth(chartWidth, opening.reveal), 0);

    state = { ...opening, reveal: 1 };
    assert.equal(clipWidth(chartWidth, state.reveal), chartWidth);

    const rewritten = ORIGINAL.map((sample) => ({
      distance_m: sample.distance_m,
      elevation_m: sample.elevation_m + 40,
    }));
    cache = writeElevationProfile(cache, 'trail-diablo', rewritten);
    const updated = readTrail(cache, 'trail-diablo');
    assert.notEqual(updated.elevation_profile, ORIGINAL);
    assert.equal(updated.elevation_profile.length, ORIGINAL.length);

    const after = applyElevationUpdate(state, {
      trailId: updated.id,
      samplesChanged: updated.elevation_profile !== ORIGINAL,
      reducedMotion: false,
    });

    assert.equal(after.replay, false);
    assert.equal(after.easeShape, true);
    assert.equal(after.reveal, 1);
    assert.equal(after.hapticIndex, state.hapticIndex);
    assert.equal(clipWidth(chartWidth, after.reveal), chartWidth);

    const mid = blendProfiles(ORIGINAL, updated.elevation_profile, 0.5);
    assert.ok(mid.length >= 2);
    assert.equal(mid.length, updated.elevation_profile.length);
    assert.ok(mid[1].elevation_m > ORIGINAL[1].elevation_m);
    assert.ok(mid[1].elevation_m < updated.elevation_profile[1].elevation_m);
    assert.equal(clipWidth(chartWidth, after.reveal), chartWidth);
  });

  it('replays the wipe when the open trail id changes', () => {
    const finished: RevealState = {
      trailId: 'trail-diablo',
      reveal: 1,
      hapticIndex: 3,
    };
    const next = applyElevationUpdate(finished, {
      trailId: 'trail-tam',
      samplesChanged: true,
      reducedMotion: false,
    });
    assert.equal(next.replay, true);
    assert.equal(next.reveal, 0);
    assert.equal(next.easeShape, false);
    assert.equal(next.hapticIndex, null);
    assert.equal(clipWidth(1150, next.reveal), 0);
  });
});

describe('telemetry count-up', () => {
  it('does not replay when the same trail gets new numbers', () => {
    const opened = planCountUp(
      { trailId: null, value: null },
      { trailId: 'trail-diablo', value: 1173 },
    );
    assert.equal(opened.replay, true);
    assert.equal(opened.showDirect, false);

    const rewritten = planCountUp(
      { trailId: 'trail-diablo', value: 1173 },
      { trailId: 'trail-diablo', value: 1210 },
    );
    assert.equal(rewritten.replay, false);
    assert.equal(rewritten.showDirect, true);
    assert.equal(rewritten.fadeMs, 300);
  });
});
