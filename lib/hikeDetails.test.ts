import test from 'node:test';
import assert from 'node:assert/strict';

import { CONDITION_CHIPS, TERRAIN_CHIPS, cleanGear, companionsLine, splitChips } from './hikeDetails.ts';
import { mapFeedPost } from './postRules.ts';

test('terrain and condition chips', () => {
  assert.deepEqual(TERRAIN_CHIPS, ['Rocky', 'Roots', 'Sandy', 'Snow', 'Scramble', 'Paved']);
  assert.deepEqual(CONDITION_CHIPS, ['Dry', 'Muddy', 'Rain', 'Fog', 'Hot', 'Windy', 'Icy']);
});

test('splitChips sorts picked chips into terrain and conditions', () => {
  assert.deepEqual(splitChips(['Muddy', 'Rocky', 'Snow', 'Hot', 'Nope']), { terrain: ['Rocky', 'Snow'], conditions: ['Muddy', 'Hot'] });
});

test('cleanGear trims, drops empties and repeats, caps length and count', () => {
  assert.deepEqual(cleanGear(['  Salomon X Ultra 4 ', '', 'salomon x ultra 4', 'Poles']), ['Salomon X Ultra 4', 'Poles']);
  assert.equal(cleanGear(['x'.repeat(80)])[0].length, 60);
  assert.equal(cleanGear(Array.from({ length: 20 }, (_, i) => `Item ${i}`)).length, 12);
});

test('companionsLine reads like a sentence', () => {
  assert.equal(companionsLine([]), null);
  assert.equal(companionsLine(['Maya']), 'with Maya');
  assert.equal(companionsLine(['Maya', 'Jordan']), 'with Maya and Jordan');
  assert.equal(companionsLine(['Maya', 'Jordan', 'Sam']), 'with Maya, Jordan and Sam');
  assert.equal(companionsLine(['A', 'B', 'C', 'D', 'E']), 'with A, B, C and 2 others');
});

test('a post carries terrain, conditions, gear and who you hiked with', () => {
  const post = mapFeedPost({
    post_id: 'p1',
    username: 'maya',
    bucket: 'loved',
    terrain: ['Rocky'],
    conditions: ['Muddy'],
    gear: ['Poles'],
    companions: [{ id: 'u2', username: 'jordan', display_name: 'Jordan' }, { bad: true }],
  });
  assert.deepEqual(post?.terrain, ['Rocky']);
  assert.deepEqual(post?.conditions, ['Muddy']);
  assert.deepEqual(post?.gear, ['Poles']);
  assert.deepEqual(post?.companions, [{ id: 'u2', username: 'jordan', displayName: 'Jordan' }]);
});

test('an older post without them maps to empty lists', () => {
  const post = mapFeedPost({ post_id: 'p1', username: 'maya', bucket: 'loved' });
  assert.deepEqual(post?.gear, []);
  assert.deepEqual(post?.companions, []);
});
