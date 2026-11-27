import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseSignInMemory, type SignInMemory, type SignInMethod } from '@/lib/signInMemory';

interface SignInState extends SignInMemory {
  remember: (method: SignInMethod, email?: string | null) => void;
  confirmAge: (birthYear: number) => void;
}

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
