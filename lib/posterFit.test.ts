import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { posterLayout, posterLineEm } from './posterFit.ts';

const SE_WIDTH = 327;

function fits(name: string, width: number) {
  const { lines, fontSize } = posterLayout(name, width);
  for (const line of lines) assert.ok(posterLineEm(line) * fontSize <= width, `${line} overflows`);
  return { lines, fontSize };
}

describe('posterLayout', () => {
  it('shrinks a long single word instead of breaking it', () => {
    const { lines, fontSize } = fits('KILIMANJARO', SE_WIDTH);
    assert.deepEqual(lines, ['KILIMANJARO']);
    assert.ok(fontSize < 84);
  });

  it('breaks only between words, into at most two lines', () => {
    assert.deepEqual(fits('ANNAPURNA CIRCUIT', SE_WIDTH).lines, ['ANNAPURNA', 'CIRCUIT']);
    assert.deepEqual(fits('TOUR DU MONT BLANC', SE_WIDTH).lines, ['TOUR DU', 'MONT BLANC']);
    assert.deepEqual(fits('EIGER NORTH FACE', SE_WIDTH).lines.length, 2);
  });

  it('keeps short names at full size', () => {
    assert.deepEqual(fits('K2', SE_WIDTH), { lines: ['K2'], fontSize: 84 });
  });

  it('fits every name on the widest phone too', () => {
    for (const name of ['MATTERHORN', 'TROLLTUNGA', 'ACONCAGUA', 'THE DAWN WALL']) fits(name, 382);
  });
});
