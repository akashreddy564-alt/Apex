import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatHeroElevation } from './format.ts';

describe('formatHeroElevation', () => {
  it('converts metres to grouped feet with an uppercase unit', () => {
    assert.equal(formatHeroElevation(6812), '22,349 FT');
    assert.equal(formatHeroElevation(8849), '29,032 FT');
    assert.equal(formatHeroElevation(0), '0 FT');
  });

  it('shows the missing-metric dash for a non-finite elevation', () => {
    assert.equal(formatHeroElevation(Number.NaN), '–');
    assert.equal(formatHeroElevation(Number.POSITIVE_INFINITY), '–');
  });
});
