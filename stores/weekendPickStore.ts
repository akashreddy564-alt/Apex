import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WeekendPickState {
  /** The Monday (YYYY-MM-DD) the skips belong to. */
  week: string;
  skipped: string[];
  skip: (week: string, trailId: string) => void;
}

/** "Not this one" for the weekend pick. Skips reset when the week changes. */
export const useWeekendPickStore = create<WeekendPickState>()(
  persist(
    (set) => ({
      week: '',
      skipped: [],
      skip: (week, trailId) =>
        set((state) => ({
          week,
          skipped: state.week === week ? [...state.skipped.filter((id) => id !== trailId), trailId] : [trailId],
        })),
    }),
    {
      name: 'apex-weekend-pick',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ week: state.week, skipped: state.skipped }),
    },
  ),
);
