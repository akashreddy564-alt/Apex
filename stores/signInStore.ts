import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseSignInMemory, type SignInMemory, type SignInMethod } from '@/lib/signInMemory';

interface SignInState extends SignInMemory {
  remember: (method: SignInMethod, email?: string | null) => void;
  confirmAge: (birthYear: number) => void;
}

/** A sign-in that's under way: recorded as the last method once Supabase says it finished. */
let pending: { method: SignInMethod; email: string | null; at: number } | null = null;
const PENDING_MS = 30 * 60_000;

/** Call when a sign-in starts (Apple sheet, Google sheet, email link or code sent, password). */
export function startSignIn(method: SignInMethod, email: string | null = null): void {
  pending = { method, email, at: Date.now() };
}

/**
 * Called on Supabase's SIGNED_IN event, whichever path (code, link, sheet)
 * completed it. If the app restarted in between (a link opened later), the
 * account's own provider stands in for the method.
 */
export function finishSignIn(email: string | null | undefined, provider: unknown): void {
  const fresh = pending && Date.now() - pending.at <= PENDING_MS ? pending : null;
  pending = null;
  const method = fresh?.method ?? METHODS.find((m) => m === provider);
  if (method) useSignIn.getState().remember(method, email ?? fresh?.email ?? null);
}

const METHODS: SignInMethod[] = ['apple', 'google', 'email'];

/**
 * What this phone remembers about signing in: the last way you did it (so
 * the sign-in screen can point at it) and that you passed the age check.
 * Stays on the phone; nothing here is uploaded.
 */
export const useSignIn = create<SignInState>()(
  persist(
    (set) => ({
      ...parseSignInMemory(undefined),
      remember: (method, email) => set({ lastMethod: method, lastEmail: email ?? null }),
      confirmAge: (birthYear) => set({ birthYear }),
    }),
    {
      name: 'apex-sign-in',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lastMethod: s.lastMethod, lastEmail: s.lastEmail, birthYear: s.birthYear }),
      merge: (persisted, current) => ({ ...current, ...parseSignInMemory(persisted) }),
    },
  ),
);
