import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { scoreBadgeContent } from './scoreBadge.ts';

describe('scoreBadgeContent', () => {
  it('shows a one-decimal score once a bucket has 3 or more hikes', () => {
    assert.deepEqual(scoreBadgeContent('disliked', 5, 3.14), { value: '3.1', label: 'Nope', tone: 'disliked' });
    assert.equal(scoreBadgeContent('fine', 3, 6).value, '6.0');
  });

  it('shows only the bucket word for a bucket of 1 or 2', () => {
    assert.deepEqual(scoreBadgeContent('loved', 2, 9.6), { value: null, label: 'Loved', tone: 'loved' });
    assert.deepEqual(scoreBadgeContent('fine', 1, 5.5), { value: null, label: 'Fine', tone: 'fine' });
  });
});
