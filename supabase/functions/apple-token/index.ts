// apple-token: keeps Sign in with Apple revocable (App Store guideline 5.1.1(v)).
//
// The app calls this with the signed-in person's token and one of:
//   { action: 'store', code }  right after Sign in with Apple. `code` is the
//                              one-time authorizationCode. We trade it at
//                              Apple for a refresh token and save it with
//                              save_apple_token (service role only).
//   { action: 'revoke' }       right before account deletion. We send the
//                              saved token to Apple's revoke endpoint. No
//                              saved token (not an Apple account) is fine.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   APPLE_TEAM_ID      the 10-character Team ID
//   APPLE_KEY_ID       the Key ID of a key with Sign in with Apple enabled
//   APPLE_PRIVATE_KEY  the whole .p8 file, BEGIN/END lines included
//   APPLE_CLIENT_ID    optional; defaults to the bundle id com.apex.trails
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided.
// Needs migration 032_apple_tokens.sql. Setup: docs/apple-token-revocation.md
//
// Deploy: supabase functions deploy apple-token

import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  APPLE_REVOKE_URL,
  APPLE_TOKEN_URL,
  jwtSubject,
  makeClientSecret,
  parseRequest,
  revokeBody,
  revokeOutcome,
  tokenExchangeBody,
  type AppleKeys,
} from './apple.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

function appleKeys(): AppleKeys | null {
  const teamId = Deno.env.get('APPLE_TEAM_ID')?.trim();
  const keyId = Deno.env.get('APPLE_KEY_ID')?.trim();
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY');
  const clientId = Deno.env.get('APPLE_CLIENT_ID')?.trim() || 'com.apex.trails';
  if (!teamId || !keyId || !privateKey) return null;
  return { teamId, keyId, privateKey, clientId };
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

const form = { 'Content-Type': 'application/x-www-form-urlencoded' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST' });

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply(500, { error: 'The server isn’t set up yet.' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return reply(401, { error: 'Sign in first.' });
  const asUser = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData, error: userError } = await asUser.auth.getUser(token);
  if (userError || !userData.user) return reply(401, { error: 'Sign in again.' });
  const user = userData.user;

  let request: ReturnType<typeof parseRequest> = null;
  try {
    request = parseRequest(await req.json());
  } catch {
    request = null;
  }
  if (!request) return reply(400, { error: 'Bad request.' });

  const admin = createClient(url, service, { auth: { persistSession: false } });
  const keys = appleKeys();
  const now = Math.floor(Date.now() / 1000);

  if (request.action === 'store') {
    if (!keys) return reply(503, { error: 'Apple sign-in isn’t fully set up on the server yet.' });
    const res = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: form,
      body: tokenExchangeBody(keys.clientId, await makeClientSecret(keys, now), request.code),
    });
    const body = (await readJson(res)) as { refresh_token?: unknown; id_token?: unknown } | null;
    if (!res.ok || typeof body?.refresh_token !== 'string') {
      return reply(502, { error: 'Apple didn’t accept the sign-in code.' });
    }
    // The code must belong to this person's own Apple identity.
    const apple = user.identities?.find((identity) => identity.provider === 'apple');
    const appleSub = (apple?.identity_data?.sub as string | undefined) ?? apple?.id;
    if (!appleSub || jwtSubject(body.id_token) !== appleSub) {
      return reply(403, { error: 'That Apple sign-in belongs to a different account.' });
    }
    const { error } = await admin.rpc('save_apple_token', { person: user.id, token: body.refresh_token });
    if (error) return reply(500, { error: 'Couldn’t save the Apple sign-in.' });
    return reply(200, { ok: true });
  }

  // revoke
  const { data: saved, error: readError } = await admin.rpc('apple_token', { person: user.id });
  if (readError) return reply(500, { error: 'Couldn’t check your Apple sign-in. Try again.' });
  if (typeof saved !== 'string' || !saved) return reply(200, { ok: true, revoked: false });
  if (!keys) return reply(503, { error: 'Couldn’t disconnect Sign in with Apple. Try again later.' });

  const res = await fetch(APPLE_REVOKE_URL, {
    method: 'POST',
    headers: form,
    body: revokeBody(keys.clientId, await makeClientSecret(keys, now), saved),
  });
  const outcome = revokeOutcome(res.status, await readJson(res));
  if (outcome === 'failed') {
    return reply(502, { error: 'Apple didn’t answer. Try again in a moment.' });
  }
  await admin.rpc('forget_apple_token', { person: user.id });
  return reply(200, { ok: true, revoked: true });
});
