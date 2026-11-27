import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { IqState } from '@/lib/trailIq';

interface TrailIqStore extends IqState {
  /** First pick of the day sticks. */
  answer: (day: number, pick: number, right: boolean) => void;
}

/** Your Trail IQ answers, kept on this phone. Only the last 120 days are kept. */
export const useTrailIqStore = create<TrailIqStore>()(
  persist(
    (set) => ({
      picks: {},
      right: {},
      answer: (day, pick, right) =>
        set((state) => {
          const key = String(day);
          if (state.picks[key] !== undefined) return state;
          const keep = (record: Record<string, unknown>) =>
            Object.fromEntries(Object.entries(record).filter(([d]) => Number(d) > day - 120));
          return {
            picks: { ...(keep(state.picks) as Record<string, number>), [key]: pick },
            right: { ...(keep(state.right) as Record<string, boolean>), [key]: right },
          };
        }),
    }),
    { name: 'apex-trail-iq', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
