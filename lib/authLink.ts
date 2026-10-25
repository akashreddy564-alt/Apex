/**
 * What a sign-in link carried back into the app. The client uses the PKCE
 * flow, so the link brings a one-time `code` that only this phone can turn
 * into a session. Links carrying bare tokens are ignored on purpose: anyone
 * could craft one to sign you into their own account.
 */
export type AuthLink = { kind: 'code'; code: string } | { kind: 'error'; message: string };

function params(part: string): URLSearchParams {
  return new URLSearchParams(part.startsWith('?') || part.startsWith('#') ? part.slice(1) : part);
}

/** null when the URL isn't a sign-in link. */
export function parseAuthLink(url: string | null): AuthLink | null {
  if (!url) return null;
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  const query = params(queryAt === -1 ? '' : beforeHash.slice(queryAt));
  const hash = params(hashAt === -1 ? '' : url.slice(hashAt));

  const error = hash.get('error_description') ?? query.get('error_description')
    ?? hash.get('error') ?? query.get('error');
  if (error) return { kind: 'error', message: error.replace(/\+/g, ' ') };

  const code = query.get('code');
  if (code) return { kind: 'code', code };
  return null;
}
