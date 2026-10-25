/**
 * What a sign-in link carried back into the app. Supabase puts tokens in the
 * URL fragment (implicit flow) or a `code` in the query (PKCE flow). On native,
 * supabase-js can't read these itself, so the app hands them over.
 */
export type AuthLink =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string };

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

  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  const code = query.get('code');
  if (code) return { kind: 'code', code };
  return null;
}
