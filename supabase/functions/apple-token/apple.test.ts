import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  APPLE_AUDIENCE,
  clientSecretParts,
  jwtSubject,
  makeClientSecret,
  parseRequest,
  pemToPkcs8,
  revokeBody,
  revokeOutcome,
  tokenExchangeBody,
} from './apple.ts';

function decodePart(part: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function p256Pem() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  const lines = der.toString('base64').match(/.{1,64}/g)!.join('\n');
  return { pem: `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`, publicKey: pair.publicKey, der };
}

const ids = { teamId: 'TEAM123456', keyId: 'KEY1234567', clientId: 'com.apex.trails' };

test('pemToPkcs8 reads real and escaped line breaks', async () => {
  const { pem, der } = await p256Pem();
  assert.deepEqual(Buffer.from(pemToPkcs8(pem)), der);
  assert.deepEqual(Buffer.from(pemToPkcs8(pem.replace(/\n/g, '\\n'))), der);
  assert.throws(() => pemToPkcs8('-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----'));
});

test('clientSecretParts has the claims Apple checks', () => {
  const { header, claims } = clientSecretParts(ids, 1_700_000_000);
  assert.deepEqual(header, { alg: 'ES256', kid: 'KEY1234567' });
  assert.deepEqual(claims, {
    iss: 'TEAM123456',
    iat: 1_700_000_000,
    exp: 1_700_000_300,
    aud: APPLE_AUDIENCE,
    sub: 'com.apex.trails',
  });
});

test('makeClientSecret signs an ES256 JWT the public key verifies', async () => {
  const { pem, publicKey } = await p256Pem();
  const jwt = await makeClientSecret({ ...ids, privateKey: pem.replace(/\n/g, '\\n') }, 1_700_000_000);
  const [h, c, s] = jwt.split('.');
  assert.deepEqual(decodePart(h), { alg: 'ES256', kid: 'KEY1234567' });
  assert.equal(decodePart(c).sub, 'com.apex.trails');
  const signature = Buffer.from(s, 'base64url');
  assert.equal(signature.length, 64); // raw r‖s, not DER
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    signature,
    new TextEncoder().encode(`${h}.${c}`),
  );
  assert.equal(ok, true);
});

test('form bodies', () => {
  assert.equal(
    tokenExchangeBody('com.apex.trails', 'secret', 'c.o/de').toString(),
    'client_id=com.apex.trails&client_secret=secret&code=c.o%2Fde&grant_type=authorization_code',
  );
  assert.equal(
    revokeBody('com.apex.trails', 'secret', 'r.tok').toString(),
    'client_id=com.apex.trails&client_secret=secret&token=r.tok&token_type_hint=refresh_token',
  );
});

test('revokeOutcome', () => {
  assert.equal(revokeOutcome(200, null), 'revoked');
  assert.equal(revokeOutcome(400, { error: 'invalid_grant' }), 'already_revoked');
  assert.equal(revokeOutcome(400, { error: 'invalid_client' }), 'failed');
  assert.equal(revokeOutcome(500, null), 'failed');
  assert.equal(revokeOutcome(503, { error: 'invalid_grant' }), 'failed');
});

test('jwtSubject reads sub and shrugs at junk', () => {
  const payload = Buffer.from(JSON.stringify({ sub: '001234.abcd.5678', aud: 'com.apex.trails' })).toString('base64url');
  assert.equal(jwtSubject(`x.${payload}.y`), '001234.abcd.5678');
  assert.equal(jwtSubject('x.%%%.y'), null);
  assert.equal(jwtSubject('nodots'), null);
  assert.equal(jwtSubject(undefined), null);
});

test('parseRequest', () => {
  assert.deepEqual(parseRequest({ action: 'revoke' }), { action: 'revoke' });
  assert.deepEqual(parseRequest({ action: 'store', code: 'abc' }), { action: 'store', code: 'abc' });
  assert.equal(parseRequest({ action: 'store', code: '' }), null);
  assert.equal(parseRequest({ action: 'store', code: 'x'.repeat(3000) }), null);
  assert.equal(parseRequest({ action: 'delete' }), null);
  assert.equal(parseRequest(null), null);
});
