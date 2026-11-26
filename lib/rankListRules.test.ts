import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapBoardTrail, mapRankedRow, mapTasteMatch, mapTastePick, possessive, PRIVATE_TRAIL, splitTopTen } from './rankListRules.ts';

describe('mapRankedRow', () => {
  const row = {
    trail_id: 't1', trail_name: 'Half Dome', region: 'Yosemite, CA', bucket: 'loved', score: '9.40',
    list_rank: 1, difficulty: 4, ranked_at: '2026-11-01T00:00:00Z', readable: true,
    route: { type: 'LineString', coordinates: [[-119.5, 37.7], [-119.53, 37.74]] },
  };
  it('reads a ranked trail', () => {
    const r = mapRankedRow(row);
    assert.equal(r?.rank, 1);
    assert.equal(r?.score, 9.4);
    assert.equal(r?.name, 'Half Dome');
    assert.deepEqual(r?.route, [[-119.5, 37.7], [-119.53, 37.74]]);
  });
  it('shows a trail you cannot read as a private trail with no link', () => {
    const r = mapRankedRow({ ...row, trail_id: null, trail_name: null, region: null, readable: false, route: null });
    assert.equal(r?.trailId, null);
    assert.equal(r?.name, PRIVATE_TRAIL);
    assert.equal(r?.name, 'A private trail');
    assert.equal(r?.region, '');
    assert.deepEqual(r?.route, []);
  });
  it('drops rows without a rank or with an unknown bucket', () => {
    assert.equal(mapRankedRow({ ...row, list_rank: null }), null);
    assert.equal(mapRankedRow({ ...row, bucket: 'meh' }), null);
  });
});

describe('possessive', () => {
  it('adds ’s, or just ’ after a final s', () => {
    assert.equal(possessive('Maya'), 'Maya’s');
    assert.equal(possessive('Desk hikers'), 'Desk hikers’');
    assert.equal(possessive('UW Trail Runners'), 'UW Trail Runners’');
  });
});

describe('splitTopTen', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ rank: i + 1 }));
  it('puts the first ten in the top ten and the rest after', () => {
    const { top, rest } = splitTopTen(rows);
    assert.equal(top.length, 10);
    assert.deepEqual(rest.map((r) => r.rank), [11, 12]);
  });
  it('has no rest with ten or fewer', () => {
    assert.equal(splitTopTen(rows.slice(0, 10)).rest.length, 0);
    assert.equal(splitTopTen(rows.slice(0, 3)).top.length, 3);
  });
});

describe('board, taste and picks rows', () => {
  it('reads a trail board row', () => {
    assert.deepEqual(
      mapBoardTrail({ trail_id: 't', trail_name: 'Mount Si', region: 'WA', avg_score: '8.25', rankers: 3, place: 1 }),
      { trailId: 't', name: 'Mount Si', region: 'WA', avgScore: 8.25, rankers: 3, place: 1 },
    );
    assert.equal(mapBoardTrail({ trail_id: null }), null);
  });
  it('reads a taste match, with a null agreement below the bar', () => {
    assert.deepEqual(mapTasteMatch([{ shared: 9, agreement: 82 }]), { shared: 9, agreement: 82 });
    assert.deepEqual(mapTasteMatch([{ shared: 3, agreement: null }]), { shared: 3, agreement: null });
    assert.equal(mapTasteMatch([]), null);
  });
  it('reads a taste pick', () => {
    assert.deepEqual(
      mapTastePick({ trail_id: 't', trail_name: 'Sky Pond', region: 'CO', lovers: 2, names: ['Maya Chen', 'Jo'] }),
      { trailId: 't', name: 'Sky Pond', region: 'CO', lovers: 2, names: ['Maya Chen', 'Jo'] },
    );
  });
});
