import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { parseOnboarding, type DistanceBand, type Interest, type OnboardingAnswers } from '@/lib/onboarding';

interface OnboardingState extends OnboardingAnswers {
  setBand: (band: DistanceBand) => void;
  setInterests: (interests: Interest[]) => void;
  markSeen: () => void;
}

/** First-launch answers. On this phone only; the goal itself lives in the goal store. */
export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      ...parseOnboarding(undefined),
      setBand: (band) => set({ band }),
      setInterests: (interests) => set({ interests }),
      markSeen: () => set({ seen: true }),
    }),
    {
      name: 'apex-onboarding',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen, band: s.band, interests: s.interests }),
      merge: (persisted, current) => ({ ...current, ...parseOnboarding(persisted) }),
    },
  ),
);

/** True once the saved answers have loaded, so the app knows whether to show onboarding. */
export function useOnboardingHydrated(): boolean {
  const [done, setDone] = useState(() => useOnboarding.persist.hasHydrated());
  useEffect(() => {
    if (done) return;
    const off = useOnboarding.persist.onFinishHydration(() => setDone(true));
    if (useOnboarding.persist.hasHydrated()) setDone(true);
    return off;
  }, [done]);
  return done;
}
