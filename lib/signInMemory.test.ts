import assert from 'node:assert/strict';
import { test } from 'node:test';

import { maskEmail, parseSignInMemory } from './signInMemory.ts';

test('maskEmail keeps two letters and the domain', () => {
  assert.equal(maskEmail('maya.chen@gmail.com'), 'ma•••@gmail.com');
  assert.equal(maskEmail('m@x.io'), 'm•••@x.io');
  assert.equal(maskEmail('abc@privaterelay.appleid.com'), 'Hidden email');
  assert.equal(maskEmail('nope'), null);
  assert.equal(maskEmail(null), null);
});

test('parseSignInMemory drops anything malformed', () => {
  assert.deepEqual(parseSignInMemory({ lastMethod: 'apple', lastEmail: 'a@b.co', birthYear: 1999 }), {
    lastMethod: 'apple',
    lastEmail: 'a@b.co',
    birthYear: 1999,
  });
  assert.deepEqual(parseSignInMemory({ lastMethod: 'facebook', lastEmail: 'x', birthYear: '1999' }), {
    lastMethod: null,
    lastEmail: null,
    birthYear: null,
  });
  assert.deepEqual(parseSignInMemory(null), { lastMethod: null, lastEmail: null, birthYear: null });
});
