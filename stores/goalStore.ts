import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { defaultGoal, parseGoal, type GoalMetric, type WeeklyGoal } from '@/lib/weeklyGoal';

interface GoalState extends WeeklyGoal {
  /** Switching metric resets the target to that metric's default. */
  setMetric: (metric: GoalMetric) => void;
  /** Stored units: km for distance, m for elevation. */
  setTarget: (target: number) => void;
}

/** The weekly goal. Personal and on this phone only, like display settings. */
export const useGoal = create<GoalState>()(
  persist(
    (set, get) => ({
      ...defaultGoal(),
      setMetric: (metric) => {
        if (metric !== get().metric) set(defaultGoal(metric));
      },
      setTarget: (target) => {
        if (Number.isFinite(target) && target > 0) set({ target });
      },
    }),
    {
      name: 'apex-weekly-goal',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ metric: state.metric, target: state.target }),
      merge: (persisted, current) => ({ ...current, ...parseGoal(persisted) }),
    },
  ),
);
