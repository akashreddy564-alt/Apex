import { apiError, AppError, functionErrorReason } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';

export { usesAppleSignIn } from '@/lib/appleAccount';

/**
 * Sign in with Apple stays revocable (App Store guideline 5.1.1(v)) through
 * the apple-token Edge Function. See supabase/functions/apple-token.
 */

/**
 * Hands Apple's one-time authorization code to the server, which keeps a
 * refresh token so account deletion can revoke it. The code dies within
 * minutes, so this runs right after sign-in. Never fails the sign-in.
 */
export async function saveAppleAuthorizationCode(code: string | null | undefined): Promise<void> {
  if (!supabase || !code) return;
  try {
    await supabase.functions.invoke('apple-token', { body: { action: 'store', code } });
  } catch {
    // Best effort: without it, deletion still removes the account.
  }
}

/**
 * Revokes this person's Apple tokens before their account is deleted.
 * Throws when an Apple account couldn't be disconnected, so the caller
 * stops and the person can try again.
 */
export async function revokeAppleSignIn(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.functions.invoke('apple-token', { body: { action: 'revoke' } });
  if (!error) return;
  const { message } = await functionErrorReason(error);
  if (message) throw new AppError(message, 'other');
  throw apiError(error);
}
