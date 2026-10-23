import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { palettes } from '../theme/tokens.ts';
import { contrastRatio } from './contrast.ts';

describe('contrastRatio', () => {
  it('measures black on white as 21', () => {
    assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21);
  });

  it('is the same in either order', () => {
    assert.equal(contrastRatio('#EDE6D6', '#09090B'), contrastRatio('#09090B', '#EDE6D6'));
  });
});

for (const name of ['dark', 'light'] as const) {
  const p = palettes[name];
  describe(`${name} palette`, () => {
    it('body text reads (≥ 7)', () => assert.ok(contrastRatio(p.fg, p.bg) >= 7));
    it('muted text reads (≥ 4.5)', () => assert.ok(contrastRatio(p.fgMuted, p.bg) >= 4.5));
    it('accent button label reads (≥ 4.5)', () =>
      assert.ok(contrastRatio(p.onAccent, p.accent) >= 4.5));
    it('route line shows on the map surface (≥ 3)', () =>
      assert.ok(contrastRatio(p.mapLine, p.surface) >= 3));
    it('every score color reads on bg (≥ 3)', () => {
      for (const c of [p.loved, p.fine, p.disliked]) assert.ok(contrastRatio(c, p.bg) >= 3, c);
    });
  });
}

describe('signature color', () => {
  it('is Bone in dark mode', () => assert.equal(palettes.dark.accent, '#EDE6D6'));
});

import { photoPill } from '../theme/tokens.ts';

describe('photo pill', () => {
  it('keeps light text on its dark pill in every appearance', () => {
    assert.ok(contrastRatio(photoPill.text, photoPill.solid) >= 7);
    assert.ok(contrastRatio(photoPill.top, photoPill.solid) >= 7);
  });
});
