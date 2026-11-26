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
  /** Set your difficulty rating (1–5) on a ranked trail. Returns the updated row. */
  setDifficulty: (trailId: string, difficulty: number, hikeType?: string) => TrailRanking | null;
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
        set((state) => {
          const same = (row: TrailRanking) =>
            row.user_id === ranking.user_id && row.trail_id === ranking.trail_id && row.hike_type === ranking.hike_type;
          // Re-ranking keeps the difficulty you gave before, unless this ranking brings one.
          const previous = state.rankings.find(same);
          const placed =
            ranking.difficulty === undefined && previous?.difficulty != null ? { ...ranking, difficulty: previous.difficulty } : ranking;
          return {
            rankings: withStoredScores([...state.rankings.filter((row) => !same(row)), placed]),
            comparisons: [...state.comparisons, ...comparisons],
          };
        });
      },
      setDifficulty: (trailId, difficulty, hikeType = DEFAULT_HIKE_TYPE) => {
        let updated: TrailRanking | null = null;
        set((state) => ({
          rankings: state.rankings.map((row) => {
            if (row.trail_id !== trailId || row.hike_type !== hikeType) return row;
            updated = { ...row, difficulty, updated_at: new Date().toISOString() };
            return updated;
          }),
        }));
        return updated;
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
