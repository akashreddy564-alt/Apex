import type { User } from '@supabase/supabase-js';

/** Whether this account has ever signed in with Apple. */
export function usesAppleSignIn(user: Pick<User, 'app_metadata' | 'identities'> | null | undefined): boolean {
  if (!user) return false;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes('apple')) return true;
  if (user.app_metadata?.provider === 'apple') return true;
  return (user.identities ?? []).some((identity) => identity.provider === 'apple');
}
