import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSettings } from './appearance.ts';

describe('parseSettings', () => {
  it('defaults to dark and number', () => {
    assert.deepEqual(parseSettings(undefined), { appearance: 'dark', scoreStyle: 'number' });
  });

  it('keeps valid values', () => {
    assert.deepEqual(parseSettings({ appearance: 'light', scoreStyle: 'blaze' }), {
      appearance: 'light',
      scoreStyle: 'blaze',
    });
  });

  it('drops unknown values field by field', () => {
    assert.deepEqual(parseSettings({ appearance: 'system', scoreStyle: 'peak' }), {
      appearance: 'dark',
      scoreStyle: 'peak',
    });
  });

  it('survives garbage', () => {
    assert.deepEqual(parseSettings('{oops'), { appearance: 'dark', scoreStyle: 'number' });
    assert.deepEqual(parseSettings(null), { appearance: 'dark', scoreStyle: 'number' });
  });
});
