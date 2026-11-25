import test from 'node:test';
import assert from 'node:assert/strict';

import { yourStatsByTrail, yourTrailStats } from './yourTrailStats.ts';

const log = (
  trail_id: string,
  created_at: string,
  distance_km: number | null,
  elevation_gain_m: number | null,
  duration_seconds: number | null = 3600,
) => ({ trail_id, created_at, distance_km, elevation_gain_m, duration_seconds });

test('not hiked yet: no stats at all', () => {
  assert.equal(yourTrailStats('cauley', []), null);
  assert.equal(yourTrailStats('cauley', [log('other', '2026-11-20T10:00:00Z', 3, 100)]), null);
});

test('one hike: its own distance, climb and time', () => {
  const stats = yourTrailStats('cauley', [log('cauley', '2026-11-25T15:00:00Z', 3.22, 41, 3120)]);
  assert.deepEqual(stats, {
    hikes: 1,
    distanceKm: 3.22,
    elevationGainM: 41,
    durationSeconds: 3120,
    lastHikedAt: '2026-11-25T15:00:00Z',
  });
});

test('several hikes: the most recent one wins, and they are counted', () => {
  const stats = yourTrailStats('cauley', [
    log('cauley', '2026-11-01T15:00:00Z', 5.0, 60),
    log('cauley', '2026-11-25T15:00:00Z', 3.2, 40),
    log('cauley', '2026-11-12T15:00:00Z', 4.1, 55),
  ]);
  assert.equal(stats?.hikes, 3);
  assert.equal(stats?.distanceKm, 3.2);
  assert.equal(stats?.elevationGainM, 40);
});

test('a missing or zero measurement stays missing, never borrowed', () => {
  const stats = yourTrailStats('cauley', [log('cauley', '2026-11-25T15:00:00Z', null, 0, null)]);
  assert.equal(stats?.hikes, 1);
  assert.equal(stats?.distanceKm, null);
  assert.equal(stats?.elevationGainM, null);
  assert.equal(stats?.durationSeconds, null);
});

test('a climb of zero on a measured walk is kept when the distance is real', () => {
  const stats = yourTrailStats('flat', [log('flat', '2026-11-25T15:00:00Z', 5, 0)]);
  assert.equal(stats?.elevationGainM, 0);
});

test('yourStatsByTrail groups every hiked trail', () => {
  const byTrail = yourStatsByTrail([
    log('a', '2026-11-01T15:00:00Z', 2, 10),
    log('b', '2026-11-02T15:00:00Z', 3, 20),
    log('a', '2026-11-03T15:00:00Z', 2.5, 12),
  ]);
  assert.equal(byTrail.size, 2);
  assert.equal(byTrail.get('a')?.hikes, 2);
  assert.equal(byTrail.get('a')?.distanceKm, 2.5);
  assert.equal(byTrail.get('c'), undefined);
});
