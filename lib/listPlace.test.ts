import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listPlacement, myRankOf, placementLine } from './listPlace.ts';

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

describe('myRankOf', () => {
  it('finds your place for a trail', () => {
    const mine = rows.map((r) => ({ trailId: r.trail_id, score: r.score, position: r.position }));
    assert.equal(myRankOf(mine, 'c'), 3);
    assert.equal(myRankOf(mine, 'nope'), null);
  });
});
