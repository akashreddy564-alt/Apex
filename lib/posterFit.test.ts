import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cardTitleLayout, posterLayout, posterLineEm } from './posterFit.ts';

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

describe('cardTitleLayout', () => {
  it('keeps a short name on one line at full size', () => {
    assert.deepEqual(cardTitleLayout('HALF DOME CABLES', 260), { lines: ['HALF DOME CABLES'], fontSize: 30 });
  });

  it('shrinks a medium name to stay on one line', () => {
    const layout = cardTitleLayout('ANGEL ISLAND PERIMETER', 260);
    assert.equal(layout.lines.length, 1);
    assert.ok(layout.fontSize >= 22 && layout.fontSize < 30);
  });

  it('breaks a long name between words rather than shrinking it tiny', () => {
    const layout = cardTitleLayout('EAST PEAK VIA MATT DAVIS AND STEEP RAVINE', 260);
    assert.equal(layout.lines.length, 2);
    assert.ok(layout.fontSize >= 18 && layout.fontSize <= 26);
    for (const line of layout.lines) assert.ok(posterLineEm(line) * layout.fontSize <= 260);
  });
});
