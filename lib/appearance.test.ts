import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSettings } from './appearance.ts';

describe('parseSettings', () => {
  it('defaults to light and number', () => {
    assert.deepEqual(parseSettings(undefined), { appearance: 'light', scoreStyle: 'number' });
  });

  it('keeps valid values', () => {
    assert.deepEqual(parseSettings({ appearance: 'light', scoreStyle: 'blaze' }), {
      appearance: 'light',
      scoreStyle: 'blaze',
    });
  });

  it('drops unknown values field by field', () => {
    assert.deepEqual(parseSettings({ appearance: 'system', scoreStyle: 'peak' }), {
      appearance: 'light',
      scoreStyle: 'peak',
    });
  });

  it('survives garbage', () => {
    assert.deepEqual(parseSettings('{oops'), { appearance: 'light', scoreStyle: 'number' });
    assert.deepEqual(parseSettings(null), { appearance: 'light', scoreStyle: 'number' });
  });
});

import { cssVars, palettes } from '../theme/tokens.ts';

describe('cssVars', () => {
  it('writes each color as RGB channels for NativeWind', () => {
    assert.equal(cssVars(palettes.dark)['--color-bg'], '12 14 13');
    assert.equal(cssVars(palettes.light)['--color-accent'], '28 33 30');
    assert.equal(cssVars(palettes.dark)['--color-fg-muted'], '163 166 158');
    assert.equal(cssVars(palettes.light)['--color-climb'], '148 85 42');
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

import { tabBarStyle } from '../theme/tokens.ts';

describe('tabBarStyle', () => {
  it('follows the palette so the Log tab bar repaints on a switch', () => {
    assert.equal(tabBarStyle(palettes.light).borderTopColor, palettes.light.raised);
    assert.equal(tabBarStyle(palettes.dark).borderTopColor, palettes.dark.raised);
  });

  it('floats with a clear fill, so the glass background shows through', () => {
    const style = tabBarStyle(palettes.light);
    assert.equal(style.backgroundColor, 'transparent');
    assert.equal(style.position, 'absolute');
  });

  it('grows by the bottom safe-area inset so the labels clear the home indicator', () => {
    const flat = tabBarStyle(palettes.dark);
    const inset = tabBarStyle(palettes.dark, false, 34);
    assert.equal(inset.height - flat.height, 34);
    assert.equal(inset.paddingBottom - flat.paddingBottom, 34);
    // Room for the 54 pt tab item (icon box plus a full label line) inside the padding.
    assert.ok(flat.height - flat.paddingTop - flat.paddingBottom >= 54);
  });

  it('hides the bar while recording', () => {
    assert.deepEqual(tabBarStyle(palettes.light, true), { display: 'none' });
  });
});
