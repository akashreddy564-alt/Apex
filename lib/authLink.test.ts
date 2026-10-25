import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseAuthLink } from './authLink.ts';

describe('parseAuthLink', () => {
  it('ignores links that carry bare tokens', () => {
    assert.equal(
      parseAuthLink('apex://account#access_token=aaa&expires_in=3600&refresh_token=rrr&type=magiclink'),
      null,
    );
  });

  it('reads the PKCE code from the query', () => {
    assert.deepEqual(parseAuthLink('exp://192.168.1.2:8081/--/account?code=abc123'), {
      kind: 'code',
      code: 'abc123',
    });
  });

  it('reports an expired or used link', () => {
    assert.deepEqual(
      parseAuthLink('apex://account#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),
      { kind: 'error', message: 'Email link is invalid or has expired' },
    );
  });

  it('ignores ordinary links', () => {
    assert.equal(parseAuthLink('apex://trail/123'), null);
    assert.equal(parseAuthLink('apex://friend/abc?ref=qr'), null);
    assert.equal(parseAuthLink(null), null);
  });
});
