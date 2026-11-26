import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isMissingNeighbour, listPlacement, myRankOf, placementLine, serverListRows } from './listPlace.ts';

const rows = [
  { trail_id: 'c', score: 5.5, position: 'a1' },
  { trail_id: 'a', score: 9.2, position: 'a1' },
  { trail_id: 'b', score: 8.1, position: 'a2' },
];

describe('listPlacement', () => {
  it('ranks by score and names the neighbours', () => {
    assert.deepEqual(listPlacement(rows, 'b'), { rank: 2, size: 3, aboveTrailId: 'a', belowTrailId: 'c' });
  });
  it('has no trail above the first or below the last', () => {
    assert.deepEqual(listPlacement(rows, 'a'), { rank: 1, size: 3, aboveTrailId: null, belowTrailId: 'b' });
    assert.deepEqual(listPlacement(rows, 'c'), { rank: 3, size: 3, aboveTrailId: 'b', belowTrailId: null });
  });
  it('breaks score ties by position', () => {
    const tied = [
      { trail_id: 'x', score: 8, position: 'a2' },
      { trail_id: 'y', score: 8, position: 'a1' },
    ];
    assert.equal(listPlacement(tied, 'y')?.rank, 1);
  });
  it('is null for a trail not on the list', () => {
    assert.equal(listPlacement(rows, 'zzz'), null);
  });
});

describe('placementLine', () => {
  const base = { listRank: 2, listSize: 14, aboveTrailName: 'Mount Si', belowTrailName: 'Angels Landing', firstName: 'Maya', isMine: false };
  it('says the rank and the trail just below', () => {
    assert.equal(placementLine(base), '#2 of 14 · just above Angels Landing');
  });
  it('uses the trail above when it is last', () => {
    assert.equal(placementLine({ ...base, listRank: 14, belowTrailName: null }), '#14 of 14 · just below Mount Si');
  });
  it('calls out the first trail on a list', () => {
    assert.equal(placementLine({ ...base, listRank: 1, listSize: 1, aboveTrailName: null, belowTrailName: null }), 'First trail on Maya’s list');
    assert.equal(
      placementLine({ ...base, listRank: 1, listSize: 1, aboveTrailName: null, belowTrailName: null, isMine: true }),
      'First trail on your list',
    );
  });
  it('keeps the rank when the neighbour is hidden', () => {
    assert.equal(placementLine({ ...base, aboveTrailName: null, belowTrailName: null }), '#2 of 14');
  });
  it('is null for older posts with no placement', () => {
    assert.equal(placementLine({ ...base, listRank: null, listSize: null }), null);
  });
});

describe('serverListRows', () => {
  const id = (n: number) => `7e570000-0000-4000-8000-00000000000${n}`;
  it('keeps only standard hikes on trails the server knows, with or without a cached name', () => {
    const rows = serverListRows([
      { trail_id: id(1), hike_type: 'hike', score: 9, position: 'a1' },
      { trail_id: 'local-draft', hike_type: 'hike', score: 8, position: 'a2' },
      { trail_id: id(2), hike_type: 'other', score: 7, position: 'a3' },
      { trail_id: id(3), hike_type: 'hike', score: 6, position: 'a4' },
    ]);
    assert.deepEqual(rows.map((r) => r.trail_id), [id(1), id(3)]);
    // "#2 of 2", matching the list friends see, not "#3 of 3" from the local draft.
    assert.deepEqual(listPlacement(rows, id(3)), { rank: 2, size: 2, aboveTrailId: id(1), belowTrailId: null });
  });
});

describe('isMissingNeighbour', () => {
  it('spots a foreign-key failure so the post retries without neighbours', () => {
    assert.equal(isMissingNeighbour({ code: '23503' }), true);
    assert.equal(isMissingNeighbour({ code: '42501' }), false);
    assert.equal(isMissingNeighbour(null), false);
  });
});

describe('myRankOf', () => {
  it('finds your place for a trail', () => {
    const mine = rows.map((r) => ({ trailId: r.trail_id, score: r.score, position: r.position }));
    assert.equal(myRankOf(mine, 'c'), 3);
    assert.equal(myRankOf(mine, 'nope'), null);
  });
});
