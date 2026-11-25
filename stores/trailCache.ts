import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { CATALOG_TRAILS } from '@/lib/catalog';
import { mergeCatalog } from '@/lib/catalogMerge';
import { useRankingStore } from '@/stores/rankingStore';
import type { HikeLog, Trail } from '@/types/trail';

interface TrailCacheState {
  trails: Trail[];
  logs: HikeLog[];
  hydrateFromSeed: () => void;
  getTrail: (id: string) => Trail | undefined;
  /** A user trail made from a hike. Goes on top of the list. */
  addTrail: (trail: Trail) => void;
  /** Catalog trails fetched from the server. Kept in name order, never on top. */
  rememberTrails: (trails: Trail[]) => void;
  upsertLog: (log: HikeLog) => void;
  updateLog: (id: string, patch: Partial<HikeLog>) => void;
}

/** Trails a hike or a ranking points at; these survive a catalog update. */
function loggedIds(logs: HikeLog[]): Set<string> {
  const ranked = useRankingStore.getState().rankings.map((r) => r.trail_id);
  return new Set([...logs.map((log) => log.trail_id), ...ranked]);
}

export const useTrailCache = create<TrailCacheState>()(
  persist(
    (set, get) => ({
      trails: mergeCatalog([], CATALOG_TRAILS, loggedIds([])),
      logs: [],
      hydrateFromSeed: () => {
        const { trails, logs } = get();
        set({ trails: mergeCatalog(trails, CATALOG_TRAILS, loggedIds(logs)) });
      },
      getTrail: (id) => get().trails.find((t) => t.id === id),
      addTrail: (trail) =>
        set((state) => ({
          trails: [trail, ...state.trails.filter((t) => t.id !== trail.id)],
        })),
      rememberTrails: (fetched) => {
        if (fetched.length === 0) return;
        set((state) => {
          const byId = new Map(fetched.map((t) => [t.id, t]));
          const kept = state.trails.map((t) => byId.get(t.id) ?? t);
          const known = new Set(state.trails.map((t) => t.id));
          const added = fetched.filter((t) => !known.has(t.id));
          return { trails: added.length === 0 ? kept : [...kept, ...added] };
        });
      },
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
      // An app update can bring a new catalog; saved user trails and logs stay.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Pick<TrailCacheState, 'trails' | 'logs'>>;
        const logs = saved.logs ?? current.logs;
        return {
          ...current,
          logs,
          // Nothing saved yet (a fresh install): start from the bundled catalog.
          trails: mergeCatalog(saved.trails ?? current.trails, CATALOG_TRAILS, loggedIds(logs)),
        };
      },
    },
  ),
);

export { MOCK_USER_ID };
