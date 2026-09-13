import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_TRAILS, MOCK_USER_ID } from '@/data/mockTrails';
import type { HikeLog, Trail } from '@/types/trail';

interface TrailCacheState {
  trails: Trail[];
  logs: HikeLog[];
  hydrateFromSeed: () => void;
  getTrail: (id: string) => Trail | undefined;
  upsertLog: (log: HikeLog) => void;
  updateLog: (id: string, patch: Partial<HikeLog>) => void;
}

export const useTrailCache = create<TrailCacheState>()(
  persist(
    (set, get) => ({
      trails: MOCK_TRAILS,
      logs: [],
      hydrateFromSeed: () => {
        if (get().trails.length === 0) {
          set({ trails: MOCK_TRAILS });
        }
      },
      getTrail: (id) => get().trails.find((t) => t.id === id),
      upsertLog: (log) =>
        set((state) => ({
          logs: [log, ...state.logs.filter((l) => l.id !== log.id)],
        })),
      updateLog: (id, patch) =>
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
    }),
    {
      name: 'apex-trail-cache',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ trails: s.trails, logs: s.logs }),
    },
  ),
);

export { MOCK_USER_ID };
