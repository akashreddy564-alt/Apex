import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildUserTrail, cleanTrailName, USER_TRAIL_REGION } from './userTrail.ts';

const base = {
  id: 'trail-1',
  ownerId: 'user-1',
  name: 'Bear Gulch',
  region: null,
  distanceM: 0,
  gainM: 0,
  durationSeconds: 3600,
  now: '2026-10-17T12:00:00.000Z',
};

describe('cleanTrailName', () => {
  it('trims and collapses spaces', () => {
    assert.equal(cleanTrailName('  Bear   Gulch '), 'Bear Gulch');
  });
  it('rejects blank names', () => {
    assert.equal(cleanTrailName('   '), null);
    assert.equal(cleanTrailName(''), null);
  });
  it('caps the length at 60 characters', () => {
    assert.equal(cleanTrailName('x'.repeat(80))!.length, 60);
  });
});

describe('buildUserTrail', () => {
  it('makes an empty trail from a hike with no GPS', () => {
    const trail = buildUserTrail({ ...base, points: [] });
    assert.equal(trail.source, 'user');
    assert.equal(trail.owner_id, 'user-1');
    assert.equal(trail.region, USER_TRAIL_REGION);
    assert.deepEqual(trail.path.coordinates, []);
    assert.equal(trail.distance_km, null);
    assert.equal(trail.elevation_gain_m, null);
    assert.equal(trail.peak_elevation_m, null);
    assert.deepEqual(trail.elevation_profile, []);
    assert.equal(trail.trailhead, null);
  });

  it('takes the line and climb from the recording', () => {
    const trail = buildUserTrail({
      ...base,
      region: 'Pinnacles, CA',
      distanceM: 2200,
      gainM: 140,
      points: [
        { longitude: -121.2, latitude: 36.48, altitude: 400 },
        { longitude: -121.2, latitude: 36.49, altitude: 470 },
        { longitude: -121.19, latitude: 36.49, altitude: 540 },
      ],
    });
    assert.equal(trail.region, 'Pinnacles, CA');
    assert.equal(trail.distance_km, 2.2);
    assert.equal(trail.elevation_gain_m, 140);
    assert.equal(trail.peak_elevation_m, 540);
    assert.equal(trail.path.coordinates.length, 3);
    assert.deepEqual(trail.trailhead, [-121.2, 36.48]);
    assert.equal(trail.elevation_profile.length, 3);
    assert.equal(trail.elevation_profile[0]!.distance_m, 0);
    assert.equal(trail.avg_moving_time_seconds, 3600);
    assert.equal(trail.shape, null);
  });

  it('drops a distance under 10 m', () => {
    const trail = buildUserTrail({
      ...base,
      distanceM: 4,
      points: [
        { longitude: 0, latitude: 0, altitude: null },
        { longitude: 0, latitude: 0.00003, altitude: null },
      ],
    });
    assert.equal(trail.distance_km, null);
    assert.equal(trail.peak_elevation_m, null);
  });
});
