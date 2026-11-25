import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { A_SHAPE, MARK_WIDTH, PEAK_SHAPE, SPLASH, introFrame, span, splashScale, toSvgPath } from './peakIntro.ts';

const W = 390;
const H = 844;

/** Even-odd point-in-polygon on flat screen points. */
function inside(points: number[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [points[i], points[i + 1], points[j], points[j + 1]];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('peak intro', () => {
  it('starts with the wordmark exactly where the splash draws it', () => {
    const frame = introFrame(0, W, H);
    const markPt = (SPLASH.imageWidthPt * SPLASH.markPx) / SPLASH.canvasPx;
    // The A's base-left corner is the wordmark's left edge.
    assert.ok(Math.abs(frame.peak.points[0] - (W / 2 - markPt / 2)) < 1e-6);
    assert.ok(Math.abs(MARK_WIDTH * splashScale() - markPt) < 1e-9);
    assert.equal(frame.peak.alpha, 1);
    assert.equal(frame.window, null);
    for (const letter of frame.letters) assert.equal(letter.alpha, 1);
  });

  it('keeps the A and the peak the same number of points so one morphs into the other', () => {
    assert.equal(A_SHAPE.length, PEAK_SHAPE.length);
  });

  it('has dropped the other letters and the crossbar by the time the peak lands', () => {
    const frame = introFrame(0.5, W, H);
    for (const letter of frame.letters) assert.equal(letter.alpha, 0);
    assert.equal(frame.bar.alpha, 0);
    assert.equal(frame.cap.alpha, 1);
  });

  it('ends with the peak window covering every corner of the screen', () => {
    for (const [w, h] of [
      [W, H],
      [1024, 1366],
      [844, 390],
    ]) {
      const frame = introFrame(1, w, h);
      assert.ok(frame.window);
      assert.ok(frame.done);
      for (const [x, y] of [
        [0, 0],
        [w, 0],
        [0, h],
        [w, h],
      ]) {
        assert.ok(inside(frame.window, x, y), `corner ${x},${y} of ${w}x${h}`);
      }
      assert.equal(frame.peak.alpha, 0);
    }
  });

  it('clamps progress', () => {
    assert.equal(span(-1, 0, 1), 0);
    assert.equal(span(2, 0, 1), 1);
    assert.equal(span(0.5, 0, 1), 0.5);
  });

  it('writes holes as extra subpaths', () => {
    assert.equal(toSvgPath([0, 0, 1, 0, 1, 1], [[0.2, 0.2, 0.4, 0.2, 0.4, 0.4]]), 'M0.00 0.00L1.00 0.00L1.00 1.00ZM0.20 0.20L0.40 0.20L0.40 0.40Z');
  });
});
