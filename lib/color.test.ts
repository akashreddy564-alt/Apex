import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { withAlpha } from '../theme/color.ts';

describe('withAlpha', () => {
  it('turns #RRGGBB into rgba() at the given alpha', () => {
    assert.equal(withAlpha('#FF8000', 0.5), 'rgba(255,128,0,0.5)');
    assert.equal(withAlpha('#0a0b0c', 1), 'rgba(10,11,12,1)');
  });

  it('clamps alpha to 0..1', () => {
    assert.equal(withAlpha('#000000', -1), 'rgba(0,0,0,0)');
    assert.equal(withAlpha('#000000', 2), 'rgba(0,0,0,1)');
  });

  it('passes other formats through unchanged', () => {
    for (const color of ['transparent', '#fff', 'rgba(0,0,0,0.5)', '#11223344']) {
      assert.equal(withAlpha(color, 0.5), color);
    }
  });
});
