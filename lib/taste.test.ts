import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { agreement, MIN_SHARED, TASTE_THRESHOLD } from './taste.ts';

const list = (entries: [string, number][]) => new Map(entries);

describe('agreement', () => {
  const mine = list([['a', 9], ['b', 8], ['c', 7], ['d', 6]]);
  it('is 100 for the same order', () => {
    assert.deepEqual(agreement(mine, list([['a', 8], ['b', 7], ['c', 5], ['d', 1]])), { shared: 4, agreement: 100 });
  });
  it('is 0 for the reverse order', () => {
    assert.deepEqual(agreement(mine, list([['a', 1], ['b', 2], ['c', 3], ['d', 4]])), { shared: 4, agreement: 0 });
  });
  it('counts concordant pairs: one swap of six pairs is 83', () => {
    assert.deepEqual(agreement(mine, list([['a', 9], ['b', 7], ['c', 8], ['d', 6]])), { shared: 4, agreement: 83 });
  });
  it('needs four shared trails', () => {
    assert.equal(MIN_SHARED, 4);
    assert.deepEqual(agreement(mine, list([['a', 9], ['b', 8], ['c', 7], ['z', 1]])), { shared: 3, agreement: null });
  });
  it('is null when every pair is tied', () => {
    assert.deepEqual(agreement(mine, list([['a', 5], ['b', 5], ['c', 5], ['d', 5]])), { shared: 4, agreement: null });
  });
  it('treats 70 as "your taste"', () => {
    assert.equal(TASTE_THRESHOLD, 70);
  });
});
