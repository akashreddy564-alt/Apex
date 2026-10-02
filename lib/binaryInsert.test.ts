import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { placeByChoices, type ComparisonSide, type FrozenOpponent } from './binaryInsert.ts';
import { applyElo, DEFAULT_ELO } from './elo.ts';

function opponents(scores: readonly number[]): FrozenOpponent[] {
  return scores.map((score, index) => ({
    id: String.fromCharCode(65 + index),
    elo: score,
    rankScore: score,
  }));
}

/**
 * The previous hook wrote Elo onto rank_score after every click, then took
 * the midpoint of the resorted neighbor list at the frozen insert index.
 */
function legacyMidpoint(
  scores: readonly number[],
  choices: readonly ComparisonSide[],
  startElo: number = DEFAULT_ELO,
): { insertAt: number; rankScore: number; sortedIndex: number } {
  const rows = scores.map((score) => ({ elo: score, rank: score }));
  let elo = startElo;
  let low = 0;
  let high = rows.length - 1;
  for (const choice of choices) {
    const mid = Math.floor((low + high) / 2);
    const row = rows[mid];
    const challengerWins = choice === 'challenger';
    const result = applyElo(
      challengerWins ? elo : row.elo,
      challengerWins ? row.elo : elo,
    );
    if (challengerWins) {
      elo = result.winnerElo;
      row.elo = result.loserElo;
      row.rank = result.loserElo;
      high = mid - 1;
    } else {
      row.elo = result.winnerElo;
      row.rank = result.winnerElo;
      elo = result.loserElo;
      low = mid + 1;
    }
  }
  const insertAt = low;
  const sorted = [...rows].sort((a, b) => b.rank - a.rank);
  let rankScore = DEFAULT_ELO;
  if (sorted.length === 0) rankScore = DEFAULT_ELO;
  else if (insertAt <= 0) rankScore = sorted[0].rank + 16;
  else if (insertAt >= sorted.length) rankScore = sorted[sorted.length - 1].rank - 16;
  else rankScore = (sorted[insertAt - 1].rank + sorted[insertAt].rank) / 2;
  const sortedIndex = scores.filter((score) => score > rankScore).length;
  return { insertAt, rankScore, sortedIndex };
}

describe('placeByChoices', () => {
  it('lands between the trails the user compared when a mid-search Elo write would not', () => {
    // Worse than B (1500), then better than C (1490). Frozen slot is index 2.
    // Writing Elo onto C drops it toward D, and the old midpoint falls below C.
    const scores = [1600, 1500, 1490, 1200];
    const choices: ComparisonSide[] = ['opponent', 'challenger'];
    const frozen = opponents(scores);
    const placed = placeByChoices(frozen, DEFAULT_ELO, choices);
    const legacy = legacyMidpoint(scores, choices);

    assert.equal(placed.insertAt, 2);
    assert.equal(placed.sortedIndex, placed.insertAt);
    assert.ok(placed.rankScore < scores[1]);
    assert.ok(placed.rankScore > scores[2]);
    assert.equal(placed.rankScore, (scores[1] + scores[2]) / 2);
    assert.deepEqual(
      frozen.map((row) => row.rankScore),
      scores,
    );
    assert.notEqual(legacy.sortedIndex, legacy.insertAt);
    assert.ok(legacy.rankScore < scores[2]);
  });

  it('keeps the lead review case next to B and C', () => {
    const scores = [2000, 1600, 1500, 1490];
    const choices: ComparisonSide[] = ['opponent', 'challenger'];
    const frozen = opponents(scores);
    const placed = placeByChoices(frozen, DEFAULT_ELO, choices);

    assert.equal(placed.insertAt, 2);
    assert.equal(placed.sortedIndex, 2);
    assert.equal(placed.rankScore, 1550);
    assert.deepEqual(
      placed.games.map((game) => game.opponentId),
      ['B', 'C'],
    );
    assert.deepEqual(
      frozen.map((row) => row.rankScore),
      scores,
    );
    assert.equal(placed.opponentElo.A, 2000);
    assert.equal(placed.opponentElo.D, 1490);
    assert.notEqual(placed.opponentElo.C, 1500);
    assert.notEqual(placed.rankScore, placed.elo);
  });

  it('places a trail that wins every comparison above the frozen list', () => {
    const scores = [1280, 1180, 1120];
    const placed = placeByChoices(
      opponents(scores),
      DEFAULT_ELO,
      ['challenger', 'challenger'],
    );
    assert.equal(placed.insertAt, 0);
    assert.equal(placed.sortedIndex, 0);
    assert.equal(placed.rankScore, scores[0] + 16);
  });

  it('places a trail that loses every comparison below the frozen list', () => {
    const scores = [1280, 1180, 1120];
    const placed = placeByChoices(
      opponents(scores),
      DEFAULT_ELO,
      ['opponent', 'opponent'],
    );
    assert.equal(placed.insertAt, scores.length);
    assert.equal(placed.sortedIndex, scores.length);
    assert.equal(placed.rankScore, scores[scores.length - 1] - 16);
  });

  it('uses the default score when there is nobody to compare', () => {
    const placed = placeByChoices([], 1400, []);
    assert.equal(placed.insertAt, 0);
    assert.equal(placed.sortedIndex, 0);
    assert.equal(placed.rankScore, DEFAULT_ELO);
    assert.equal(placed.elo, 1400);
    assert.equal(placed.games.length, 0);
  });
});
