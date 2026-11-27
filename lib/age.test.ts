import assert from 'node:assert/strict';
import { test } from 'node:test';

import { birthYears, defaultBirthYear, indexAt, MIN_AGE, oldEnough, OLDEST_AGE } from './age.ts';

test('birthYears runs from 100 years ago through this year, so it gives no hint', () => {
  const years = birthYears(2026);
  assert.equal(years[0], 2026 - OLDEST_AGE);
  assert.equal(years[years.length - 1], 2026);
  assert.equal(years.length, OLDEST_AGE + 1);
  assert.ok(years.includes(2026 - MIN_AGE + 1));
});

test('oldEnough lets in the youngest year and keeps out the next', () => {
  assert.equal(oldEnough(2013, 2026), true);
  assert.equal(oldEnough(2014, 2026), false);
  assert.equal(oldEnough(1926, 2026), true);
  assert.equal(oldEnough(1925, 2026), false);
  assert.equal(oldEnough(2000.5, 2026), false);
});

test('the default year is on the wheel', () => {
  assert.ok(birthYears(2026).includes(defaultBirthYear(2026)));
});

test('indexAt rounds to the nearest row and clamps', () => {
  assert.equal(indexAt(0, 44, 10), 0);
  assert.equal(indexAt(21, 44, 10), 0);
  assert.equal(indexAt(23, 44, 10), 1);
  assert.equal(indexAt(-80, 44, 10), 0);
  assert.equal(indexAt(10_000, 44, 10), 9);
  assert.equal(indexAt(50, 0, 10), 0);
});
