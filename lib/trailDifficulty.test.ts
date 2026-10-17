import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { climbRateFtPerMile, difficultyRating, paceLabel } from './trailDifficulty.ts';

describe('difficultyRating (NPS Shenandoah scale)', () => {
  it('scores sqrt(gain ft x 2 x miles) and names the band', () => {
    // 1,000 ft over 5 mi: sqrt(1000 * 2 * 5) = 100.
    const r = difficultyRating(5 * 1.609344, 1000 / 3.28084);
    assert.equal(Math.round(r!.score), 100);
    assert.equal(r!.label, 'Moderately strenuous');
    assert.equal(r!.level, 2);
  });

  it('covers every band from easiest to very strenuous', () => {
    const at = (score: number) => difficultyRating(1.609344, (score * score) / 2 / 3.28084)!;
    assert.deepEqual([at(30), at(60), at(120), at(170), at(260)].map((r) => r.label), [
      'Easiest',
      'Moderate',
      'Moderately strenuous',
      'Strenuous',
      'Very strenuous',
    ]);
    assert.deepEqual([at(30), at(60), at(120), at(170), at(260)].map((r) => r.level), [0, 1, 2, 3, 4]);
  });

  it('rates Half Dome very strenuous', () => {
    assert.equal(difficultyRating(23.2, 1460)!.label, 'Very strenuous');
  });

  it('has no rating without distance or gain', () => {
    assert.equal(difficultyRating(null, 500), null);
    assert.equal(difficultyRating(10, null), null);
    assert.equal(difficultyRating(0, 500), null);
  });
});

describe('climbRateFtPerMile', () => {
  it('is gain per mile, rounded', () => {
    assert.equal(climbRateFtPerMile(23.2, 1460), 332);
    assert.equal(climbRateFtPerMile(null, 100), null);
    assert.equal(climbRateFtPerMile(0, 100), null);
  });
});

describe('paceLabel', () => {
  it('shows minutes per mile', () => {
    // 9h20m over 14.42 mi = 38:51 per mile.
    assert.equal(paceLabel(23.2, 9 * 3600 + 20 * 60), '38:51');
    assert.equal(paceLabel(1.609344, 20 * 60), '20:00');
  });

  it('is an en dash without data', () => {
    assert.equal(paceLabel(null, 600), '–');
    assert.equal(paceLabel(5, null), '–');
    assert.equal(paceLabel(0, 600), '–');
  });
});
