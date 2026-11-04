import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SavedTrail {
  trailId: string;
  name: string;
  region: string;
  savedAt: string;
}

interface SavedTrailsState {
  saved: SavedTrail[];
  toggle: (trail: Omit<SavedTrail, 'savedAt'>) => void;
}

/**
 * Trails you want to hike, saved from friends' posts. Kept on this phone for
 * now; plan 4's weekend pick reads it.
 */
export const useSavedTrails = create<SavedTrailsState>()(
  persist(
    (set) => ({
      saved: [],
      toggle: (trail) =>
        set((state) =>
          state.saved.some((row) => row.trailId === trail.trailId)
            ? { saved: state.saved.filter((row) => row.trailId !== trail.trailId) }
            : { saved: [{ ...trail, savedAt: new Date().toISOString() }, ...state.saved] },
        ),
    }),
    {
      name: 'apex-saved-trails',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ saved: state.saved }),
    },
  ),
);
