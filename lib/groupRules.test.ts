import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isCompleteCode,
  mapBoardRow,
  mapGroup,
  mapSummary,
  movement,
  normalizeCode,
  ordinal,
  spacedCode,
  togetherLine,
} from './groupRules.ts';

describe('codes', () => {
  it('normalizes what people type or paste', () => {
    assert.equal(normalizeCode(' ab3-k9q '), 'AB3K9Q');
    assert.equal(normalizeCode('ab3k9qzz'), 'AB3K9Q');
  });

  it('accepts only the code alphabet', () => {
    assert.equal(isCompleteCode('AB3K9Q'), true);
    assert.equal(isCompleteCode('AB3K9'), false);
    assert.equal(isCompleteCode('AB0K9Q'), false);
    assert.equal(isCompleteCode('ABIK9Q'), false);
  });

  it('splits for reading aloud', () => {
    assert.equal(spacedCode('AB3K9Q'), 'AB3 K9Q');
  });
});

describe('movement', () => {
  it('reads lower places as better', () => {
    assert.equal(movement(2, 3), 'up');
    assert.equal(movement(3, 2), 'down');
    assert.equal(movement(2, 2), null);
    assert.equal(movement(2, null), null);
  });
});

describe('ordinal', () => {
  it('handles the teens', () => {
    assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 112].map(ordinal), [
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '112th',
    ]);
  });
});

describe('togetherLine', () => {
  it('names the highest landmark passed', () => {
    assert.equal(togetherLine(0), 'Nobody has climbed yet.');
    assert.equal(togetherLine(50), 'Most of the way up the Statue of Liberty');
    assert.equal(togetherLine(500), 'Higher than the Empire State Building');
    assert.equal(togetherLine(9000), 'Higher than Everest');
    assert.equal(togetherLine(20000), '2.3× Everest');
  });
});

describe('mapping rows', () => {
  it('maps my_groups rows and drops broken ones', () => {
    const group = mapGroup({
      id: 'g1', name: 'Desk hikers', color: 'teal', code: 'AB3K9Q', is_owner: true,
      member_count: '4', place: 2, previous_place: null, week_gain_m: 610,
    });
    assert.equal(group?.color, 'bone');
    assert.equal(group?.memberCount, 4);
    assert.equal(group?.previousPlace, null);
    assert.equal(mapGroup({ id: 'g1' }), null);
  });

  it('maps board rows', () => {
    const row = mapBoardRow({ user_id: 'u1', username: 'maya', display_name: null, gain_m: 300, hikes: 1, km: '7.5', place: 1, is_me: false });
    assert.equal(row?.displayName, 'maya');
    assert.equal(row?.km, 7.5);
  });

  it('maps a summary with empty cards', () => {
    const summary = mapSummary({ total_gain_m: 0, total_hikes: 0, total_km: 0, taste_match_name: 'Maya', taste_match_percent: null });
    assert.equal(summary?.topClimber, null);
    assert.equal(summary?.tasteMatch, null);
    assert.equal(mapSummary(null), null);
  });
});
