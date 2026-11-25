import test from 'node:test';
import assert from 'node:assert/strict';

import { DIFFICULTY_LABELS, difficultyLabel, mostCommonDifficulty } from './difficulty.ts';

test('five levels, easiest first', () => {
  assert.deepEqual(DIFFICULTY_LABELS, ['Easy', 'Moderate', 'Moderately strenuous', 'Strenuous', 'Very strenuous']);
});

test('difficultyLabel reads 1-5 and ignores anything else', () => {
  assert.equal(difficultyLabel(1), 'Easy');
  assert.equal(difficultyLabel(5), 'Very strenuous');
  assert.equal(difficultyLabel(0), null);
  assert.equal(difficultyLabel(6), null);
  assert.equal(difficultyLabel(null), null);
  assert.equal(difficultyLabel(2.5), null);
});

test('mostCommonDifficulty: the rating most people gave', () => {
  assert.equal(mostCommonDifficulty([4, 4, 2]), 4);
  assert.equal(mostCommonDifficulty([null, 3, undefined]), 3);
  assert.equal(mostCommonDifficulty([]), null);
  assert.equal(mostCommonDifficulty([null]), null);
});

test('a tie goes to the harder rating (better to be warned)', () => {
  assert.equal(mostCommonDifficulty([2, 4]), 4);
  assert.equal(mostCommonDifficulty([1, 1, 5, 5, 3]), 5);
});
