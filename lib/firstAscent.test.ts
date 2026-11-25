import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ascentA11yLabel, ascentRoster, formatAscentNo } from './firstAscent.ts';

describe('first ascent', () => {
  it('pads to three digits', () => {
    assert.equal(formatAscentNo(1), '#001');
    assert.equal(formatAscentNo(7), '#007');
    assert.equal(formatAscentNo(42), '#042');
    assert.equal(formatAscentNo(100), '#100');
  });

  it('builds the roster and drops rows without a valid number', () => {
    const roster = ascentRoster([
      { id: 'a', ascent_no: 1 },
      { id: 'b', ascent_no: '12' },
      { id: 'c', ascent_no: null },
      { id: 'd', ascent_no: 101 },
      { id: 'e', ascent_no: 0 },
      { ascent_no: 5 },
    ]);
    assert.deepEqual([...roster], [
      ['a', 1],
      ['b', 12],
    ]);
  });

  it('reads the number plainly to screen readers', () => {
    assert.equal(ascentA11yLabel(7), 'First Ascent number 7');
  });
});
