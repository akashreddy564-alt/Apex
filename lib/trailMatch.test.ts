import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MATCH_RADIUS_M, matchTrails, searchTrails, type MatchTrail } from './trailMatch.ts';

// 0.001° of latitude is about 111 m.
const north: MatchTrail = {
  id: 'north',
  shape: 'out-and-back',
  trailhead: null,
  path: { type: 'LineString', coordinates: [[0, 0], [0, 0.01]] },
};
const east: MatchTrail = {
  id: 'east',
  shape: 'out-and-back',
  trailhead: [0.0015, 0],
  path: { type: 'LineString', coordinates: [[0.0015, 0], [0.01, 0]] },
};
const far: MatchTrail = {
  id: 'far',
  shape: 'loop',
  trailhead: [0, 0.0063],
  path: { type: 'LineString', coordinates: [[0, 0.0063], [0.01, 0.0063]] },
};

const startAt = (lat: number, lon = 0) => ({ latitude: lat, longitude: lon });

describe('matchTrails', () => {
  it('uses a radius of 500 m', () => {
    assert.equal(MATCH_RADIUS_M, 500);
  });

  it('suggests a trail whose trailhead is about 300 m from the start', () => {
    const matches = matchTrails(startAt(-0.0027), [], [north]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0]!.trailId, 'north');
    assert.ok(Math.abs(matches[0]!.startDistanceM - 300) < 5);
  });

  it('ignores a trailhead about 700 m away', () => {
    assert.deepEqual(matchTrails(startAt(-0.0063), [], [north]), []);
  });

  it('ranks the trail the recording follows above a closer trailhead', () => {
    const recording: [number, number][] = [[0, 0.0002], [0, 0.003], [0, 0.006], [0, 0.009]];
    const matches = matchTrails({ latitude: 0, longitude: 0.0014 }, recording, [east, north]);
    assert.deepEqual(matches.map((m) => m.trailId), ['north', 'east']);
    assert.equal(matches[0]!.overlap, 1);
  });

  it('matches the far end of a point-to-point trail', () => {
    const p2p: MatchTrail = { ...north, id: 'p2p', shape: 'point-to-point' };
    const matches = matchTrails(startAt(0.0101), [], [p2p]);
    assert.equal(matches[0]?.trailId, 'p2p');
  });

  it('skips trails with no line and handles an empty list', () => {
    const empty: MatchTrail = { id: 'empty', path: { type: 'LineString', coordinates: [] } };
    assert.deepEqual(matchTrails(startAt(0), [], [empty]), []);
    assert.deepEqual(matchTrails(startAt(0), [], []), []);
  });

  it('keeps at most `limit` matches', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ ...north, id: `t${i}` }));
    assert.equal(matchTrails(startAt(0), [], many, 3).length, 3);
  });

  it('does not match a loop trail by its last point', () => {
    assert.equal(matchTrails(startAt(0.0063, 0.001), [], [far]).length, 1);
    assert.deepEqual(matchTrails(startAt(0.0063, 0.01), [], [far]), []);
  });
});

describe('searchTrails', () => {
  const trails = [
    { name: 'Mount Si', region: 'North Bend, WA' },
    { name: 'Mailbox Peak', region: 'North Bend, WA' },
    { name: 'Mission Peak', region: 'Fremont, CA' },
  ];

  it('matches every word across name and region, ignoring case', () => {
    assert.deepEqual(searchTrails(trails, 'peak wa').map((t) => t.name), ['Mailbox Peak']);
    assert.deepEqual(searchTrails(trails, 'PEAK').length, 2);
  });

  it('returns nothing for a blank query', () => {
    assert.deepEqual(searchTrails(trails, '   '), []);
  });
});
