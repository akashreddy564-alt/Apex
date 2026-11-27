// Pure helpers for talking to Apple's token endpoints. No Deno or npm imports,
// so the same file runs in the Edge Function and under `node --test`.

export const APPLE_AUDIENCE = 'https://appleid.apple.com';
export const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
export const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

export type AppleKeys = { teamId: string; keyId: string; clientId: string; privateKey: string };

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlJson(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

/**
 * The bytes inside a .p8 / PKCS#8 PEM. Secrets set from a shell often arrive
 * with literal "\n" instead of line breaks, so both are accepted.
 */
export function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  if (!body) throw new Error('APPLE_PRIVATE_KEY is empty');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Header and claims of the client secret Apple asks for. Lives 5 minutes. */
export function clientSecretParts(keys: Omit<AppleKeys, 'privateKey'>, nowSeconds: number) {
  return {
    header: { alg: 'ES256', kid: keys.keyId },
    claims: {
      iss: keys.teamId,
      iat: nowSeconds,
      exp: nowSeconds + 300,
      aud: APPLE_AUDIENCE,
      sub: keys.clientId,
    },
  };
}

/**
 * The client secret: an ES256 JWT signed with the Sign in with Apple key.
 * WebCrypto's ECDSA signature is already raw r‖s, which is what JWS wants.
 */
export async function makeClientSecret(keys: AppleKeys, nowSeconds: number): Promise<string> {
  const { header, claims } = clientSecretParts(keys, nowSeconds);
  const signingInput = `${base64urlJson(header)}.${base64urlJson(claims)}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(keys.privateKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

/** Form body that trades a one-time authorization code for tokens. Native apps send no redirect_uri. */
export function tokenExchangeBody(clientId: string, clientSecret: string, code: string): URLSearchParams {
  return new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  });
}

/** Form body that revokes a refresh token. */
export function revokeBody(clientId: string, clientSecret: string, refreshToken: string): URLSearchParams {
  return new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
}

/**
 * What a revoke answer means. 200 is done. invalid_grant means the token is
 * already dead (the person removed Apex in their Apple ID settings, or it was
 * revoked before), which is just as good. Anything else is worth a retry.
 */
export function revokeOutcome(status: number, body: unknown): 'revoked' | 'already_revoked' | 'failed' {
  if (status === 200) return 'revoked';
  const error = (body as { error?: unknown } | null)?.error;
  if (status === 400 && error === 'invalid_grant') return 'already_revoked';
  return 'failed';
}

/** The `sub` inside a JWT's payload, unverified. Only for tokens that came straight from Apple over TLS. */
export function jwtSubject(jwt: unknown): string | null {
  if (typeof jwt !== 'string') return null;
  const part = jwt.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0))));
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** The request body the app sends, or null when it makes no sense. */
export function parseRequest(body: unknown): { action: 'store'; code: string } | { action: 'revoke' } | null {
  const b = body as { action?: unknown; code?: unknown } | null;
  if (b?.action === 'revoke') return { action: 'revoke' };
  if (b?.action === 'store' && typeof b.code === 'string' && b.code.length > 0 && b.code.length <= 2048) {
    return { action: 'store', code: b.code };
  }
  return null;
}
