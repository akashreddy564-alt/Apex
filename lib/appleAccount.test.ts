import assert from 'node:assert/strict';
import { test } from 'node:test';

import { usesAppleSignIn } from './appleAccount.ts';

test('usesAppleSignIn finds Apple in providers or identities', () => {
  assert.equal(usesAppleSignIn({ app_metadata: { provider: 'email', providers: ['email', 'apple'] }, identities: [] }), true);
  assert.equal(usesAppleSignIn({ app_metadata: { provider: 'apple' } }), true);
  assert.equal(
    usesAppleSignIn({ app_metadata: {}, identities: [{ provider: 'apple' }] as never }),
    true,
  );
  assert.equal(usesAppleSignIn({ app_metadata: { provider: 'google', providers: ['google'] }, identities: [] }), false);
  assert.equal(usesAppleSignIn(null), false);
});
