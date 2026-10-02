import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PairwiseComparison } from '@/types/trail';

interface ComparisonState {
  comparisons: PairwiseComparison[];
  add: (comparison: PairwiseComparison) => void;
  setAll: (comparisons: PairwiseComparison[]) => void;
}

export const useComparisonStore = create<ComparisonState>()(
  persist(
    (set) => ({
      comparisons: [],
      add: (comparison) =>
        set((state) => ({
          comparisons: [
            comparison,
            ...state.comparisons.filter((row) => row.id !== comparison.id),
          ],
        })),
      setAll: (comparisons) => set({ comparisons }),
    }),
    {
      name: 'apex-comparisons',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ comparisons: state.comparisons }),
    },
  ),
);
