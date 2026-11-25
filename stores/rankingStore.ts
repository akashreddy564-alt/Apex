import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_HIKE_TYPE,
  migrateLegacyRankings,
  withStoredScores,
  type LegacyRanking,
} from '@/lib/ranking';
import type { PairwiseComparison, TrailRanking } from '@/types/trail';

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
      rankings: [],
      comparisons: [],
      getRanking: (trailId, hikeType = DEFAULT_HIKE_TYPE) =>
        get().rankings.find(
          (row) => row.trail_id === trailId && row.hike_type === hikeType,
        ),
      upsertRanking: (ranking) => {
        set((state) => ({
          rankings: withStoredScores([
            ...state.rankings.filter(
              (row) =>
                !(
                  row.user_id === ranking.user_id &&
                  row.trail_id === ranking.trail_id &&
                  row.hike_type === ranking.hike_type
                ),
            ),
            ranking,
          ]),
        }));
      },
      setRankings: (rankings) => set({ rankings: withStoredScores(rankings) }),
      place: (ranking, comparisons) => {
        set((state) => ({
          rankings: withStoredScores([
            ...state.rankings.filter(
              (row) =>
                !(
                  row.user_id === ranking.user_id &&
                  row.trail_id === ranking.trail_id &&
                  row.hike_type === ranking.hike_type
                ),
            ),
            ranking,
          ]),
          comparisons: [...state.comparisons, ...comparisons],
        }));
      },
    }),
    {
      name: 'apex-rankings',
      version: 2,
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
        const rankings =
          version < 1
            ? migrateLegacyRankings(state.rankings ?? [])
            : withStoredScores((state.rankings ?? []) as TrailRanking[]);
        return {
          rankings,
          comparisons: state.comparisons ?? [],
        };
      },
    },
  ),
);
