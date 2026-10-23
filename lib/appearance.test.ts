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

import { cssVars, palettes } from '../theme/tokens.ts';

describe('cssVars', () => {
  it('writes each color as RGB channels for NativeWind', () => {
    assert.equal(cssVars(palettes.dark)['--color-bg'], '9 9 11');
    assert.equal(cssVars(palettes.light)['--color-accent'], '42 38 32');
    assert.equal(cssVars(palettes.dark)['--color-fg-muted'], '161 161 170');
  });
});

import { applyNativeScheme } from './appearance.ts';

describe('applyNativeScheme', () => {
  it('sets the native scheme where the platform supports it', () => {
    const calls: string[] = [];
    applyNativeScheme('light', { setColorScheme: (s: string) => calls.push(s) });
    assert.deepEqual(calls, ['light']);
  });

  it('does nothing on web, where setColorScheme does not exist', () => {
    assert.doesNotThrow(() => applyNativeScheme('dark', {}));
  });
});
