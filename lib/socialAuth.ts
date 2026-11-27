import * as AppleAuthentication from 'expo-apple-authentication';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { apiError } from '@/lib/apiError';
import { saveAppleAuthorizationCode } from '@/lib/appleToken';
import { claimAuthCode, parseAuthLink } from '@/lib/authLink';
import { supabase } from '@/lib/supabase';

export type SocialResult = { ok: true; email: string | null } | { ok: false; canceled: boolean; message: string };

const canceled: SocialResult = { ok: false, canceled: true, message: '' };

/** Started at launch, so the Apple button is ready (or known missing) before the screen opens. */
export const appleAvailable: Promise<boolean> =
  // The installed app's own bundle id, not the config: a dev build reads its
  // config from the Mac's Metro server, whose local .env may name a Personal
  // Team id. Only the real com.apex.trails build carries the Apple capability.
  Platform.OS === 'ios' && Application.applicationId === 'com.apex.trails'
    ? AppleAuthentication.isAvailableAsync().catch(() => false)
    : Promise.resolve(false);

/**
 * Sign in with Apple, finished by Supabase. Apple gets a SHA-256 of a
 * one-time nonce and Supabase gets the nonce itself, so a stolen token
 * can't be replayed. Apple sends the name only the first time, so it's
 * saved on the account straight away.
 */
export async function signInWithApple(): Promise<SocialResult> {
  if (!supabase) return { ok: false, canceled: false, message: 'Sign-in isn’t set up in this copy of Apex.' };
  const nonce = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return canceled;
    return { ok: false, canceled: false, message: 'Apple sign-in didn’t finish. Try again.' };
  }
  if (!credential.identityToken) return { ok: false, canceled: false, message: 'Apple didn’t send a sign-in token. Try again.' };

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  if (error) return { ok: false, canceled: false, message: apiError(error).message };

  // The server keeps a refresh token so deleting the account can revoke it.
  void saveAppleAuthorizationCode(credential.authorizationCode);

  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ').trim();
  if (name) void supabase.auth.updateUser({ data: { full_name: name } });
  return { ok: true, email: data.user?.email ?? credential.email ?? null };
}

/**
 * Sign in with Google through Supabase's OAuth flow in the system browser
 * sheet (no Google SDK in the app). It comes back to /account with a PKCE
 * code that only this phone can exchange. On web the page redirects.
 */
export async function signInWithGoogle(): Promise<SocialResult> {
  if (!supabase) return { ok: false, canceled: false, message: 'Sign-in isn’t set up in this copy of Apex.' };
  const redirectTo = Platform.OS === 'web' ? `${window.location.origin}/account` : Linking.createURL('/account');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) return { ok: false, canceled: false, message: apiError(error).message };
  if (Platform.OS === 'web') return canceled; // The browser is leaving for Google.
  if (!data.url) return { ok: false, canceled: false, message: 'Couldn’t reach Google. Try again.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return canceled;
  const link = parseAuthLink(result.url);
  if (!link) return canceled;
  if (link.kind === 'error') return { ok: false, canceled: false, message: link.message };
  // The same URL can also reach the app's link handler; only one of us exchanges it.
  if (!claimAuthCode(link.code)) return { ok: true, email: null };
  const exchanged = await supabase.auth.exchangeCodeForSession(link.code);
  if (exchanged.error) return { ok: false, canceled: false, message: apiError(exchanged.error).message };
  return { ok: true, email: exchanged.data.user?.email ?? null };
}
