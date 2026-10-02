import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateNKeysBetween } from 'fractional-indexing';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_USER_ID } from '@/data/mockTrails';
import {
  DEFAULT_HIKE_TYPE,
  migrateLegacyRankings,
  type LegacyRanking,
} from '@/lib/ranking';
import type { PairwiseComparison, TrailRanking } from '@/types/trail';

const SEED_KEYS = generateNKeysBetween(null, null, 5);

/** Seed a few ranked trails so placement is immediately demoable. Best first. */
const SEED_RANKINGS: TrailRanking[] = [
  ['trail-halfdome', 4],
  ['trail-diablo', 3],
  ['trail-tam', 3],
  ['trail-raineer', 2],
  ['trail-mission', 2],
].map(([trailId, comparisons], index) => ({
  id: `rank-${trailId}`,
  user_id: MOCK_USER_ID,
  trail_id: String(trailId),
  hike_type: DEFAULT_HIKE_TYPE,
  bucket: 'loved',
  position: SEED_KEYS[index] ?? `a${index}`,
  comparison_count: Number(comparisons),
  updated_at: new Date().toISOString(),
}));

interface RankingState {
  rankings: TrailRanking[];
  comparisons: PairwiseComparison[];
  getRanking: (trailId: string, hikeType?: string) => TrailRanking | undefined;
  upsertRanking: (ranking: TrailRanking) => void;
  setRankings: (rankings: TrailRanking[]) => void;
  /** One ranking row plus the comparisons from the finished session. */
  place: (ranking: TrailRanking, comparisons: PairwiseComparison[]) => void;
}

export const useRankingStore = create<RankingState>()(
  persist(
    (set, get) => ({
      rankings: SEED_RANKINGS,
      comparisons: [],
      getRanking: (trailId, hikeType = DEFAULT_HIKE_TYPE) =>
        get().rankings.find(
          (row) => row.trail_id === trailId && row.hike_type === hikeType,
        ),
      upsertRanking: (ranking) => {
        set((state) => ({
          rankings: [
            ...state.rankings.filter(
              (row) =>
                !(
                  row.user_id === ranking.user_id &&
                  row.trail_id === ranking.trail_id &&
                  row.hike_type === ranking.hike_type
                ),
            ),
            ranking,
          ],
        }));
      },
      setRankings: (rankings) => set({ rankings }),
      place: (ranking, comparisons) => {
        set((state) => ({
          rankings: [
            ...state.rankings.filter(
              (row) =>
                !(
                  row.user_id === ranking.user_id &&
                  row.trail_id === ranking.trail_id &&
                  row.hike_type === ranking.hike_type
                ),
            ),
            ranking,
          ],
          comparisons: [...state.comparisons, ...comparisons],
        }));
      },
    }),
    {
      name: 'apex-rankings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        rankings: state.rankings,
        comparisons: state.comparisons,
      }),
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as {
          rankings?: LegacyRanking[];
          comparisons?: PairwiseComparison[];
        };
        if (version < 1) {
          return {
            rankings: migrateLegacyRankings(state.rankings ?? []),
            comparisons: state.comparisons ?? [],
          };
        }
        return {
          rankings: state.rankings ?? [],
          comparisons: state.comparisons ?? [],
        };
      },
    },
  ),
);
