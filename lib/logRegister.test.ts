import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { newestLog, registerRank, registerReasons } from './logRegister.ts';
import type { StoredRanking } from './ranking.ts';

const trails = new Map([
  ['a', { id: 'a', name: 'Angels Landing', distance_km: 8.7, elevation_gain_m: 450 }],
  ['b', { id: 'b', name: 'Colchuck Lake', distance_km: 6, elevation_gain_m: 300 }],
  ['c', { id: 'c', name: 'Delicate Arch', distance_km: 5, elevation_gain_m: 200 }],
]);
const trailOf = (id: string) => trails.get(id);

const log = (id: string, trail: string, at: string, extra: object = {}) => ({
  id,
  trail_id: trail,
  created_at: at,
  duration_seconds: 3600,
  ...extra,
});

describe('newestLog', () => {
  it('picks the latest created_at, not the first in the list', () => {
    const logs = [log('1', 'b', '2026-11-01T00:00:00Z'), log('2', 'a', '2026-11-20T00:00:00Z')];
    assert.equal(newestLog(logs)?.id, '2');
    assert.equal(newestLog([]), null);
  });
});

describe('registerReasons', () => {
  it("falls back to the trail's figures when the log has none", () => {
    // Log 1 has no numbers of its own; Angels' 450 m beats the others' trail figures.
    const logs = [log('1', 'a', 'x'), log('2', 'b', 'x'), log('3', 'c', 'x')];
    assert.equal(registerReasons(logs[0], logs, trailOf).climb, 'Your biggest climb yet');
  });

  it("prefers the log's own numbers over its trail's", () => {
    const logs = [log('1', 'a', 'x', { elevation_gain_m: 100 }), log('2', 'b', 'x'), log('3', 'c', 'x')];
    assert.equal(registerReasons(logs[0], logs, trailOf).climb, null);
  });

  it('does not compare a hike with itself', () => {
    // Only one other hike: too few to claim a record, even though the list has two.
    const logs = [log('1', 'a', 'x'), log('2', 'c', 'x')];
    assert.equal(registerReasons(logs[0], logs, trailOf).climb, null);
  });
});

describe('registerRank', () => {
  const row = (trail: string, position: string, score: number, user = 'me'): StoredRanking => ({
    id: trail + user,
    user_id: user,
    trail_id: trail,
    hike_type: 'hike',
    bucket: 'loved',
    position,
    score,
    comparison_count: 1,
    updated_at: '',
  });
  const rankings = [row('b', 'a0', 9.6), row('a', 'a1', 9.1), row('c', 'a2', 8.4), row('a', 'a0', 5, 'someone-else')];

  it('names the trail just below and just above', () => {
    const rank = registerRank(rankings, 'a', trailOf);
    assert.equal(rank?.ordinal, 2);
    assert.equal(rank?.total, 3);
    assert.equal(rank?.reason, 'Above Delicate Arch, below Colchuck Lake');
  });

  it('names only one neighbor at either end', () => {
    assert.equal(registerRank(rankings, 'b', trailOf)?.reason, 'Above Angels Landing');
    assert.equal(registerRank(rankings, 'c', trailOf)?.reason, 'Below Angels Landing');
  });

  it('is null for an unranked trail', () => {
    assert.equal(registerRank(rankings, 'zzz', trailOf), null);
  });
});
