import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateNKeysBetween } from 'fractional-indexing';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_USER_ID } from '@/data/mockTrails';
import {
  DEFAULT_HIKE_TYPE,
  migrateLegacyRankings,
  withStoredScores,
  type Bucket,
  type LegacyRanking,
} from '@/lib/ranking';
import type { PairwiseComparison, TrailRanking } from '@/types/trail';

const SEED_KEYS = generateNKeysBetween(null, null, 6);

/** Seed a few ranked trails so placement is immediately demoable. Best first. */
const SEED_ROWS: { trailId: string; comparisons: number; bucket: Bucket }[] = [
  { trailId: 'trail-halfdome', comparisons: 4, bucket: 'loved' },
  { trailId: 'trail-diablo', comparisons: 3, bucket: 'loved' },
  { trailId: 'trail-tam', comparisons: 3, bucket: 'loved' },
  { trailId: 'trail-raineer', comparisons: 2, bucket: 'loved' },
  { trailId: 'trail-mission', comparisons: 2, bucket: 'loved' },
  { trailId: 'trail-lands', comparisons: 1, bucket: 'fine' },
];

const SEED_RANKINGS: TrailRanking[] = withStoredScores(
  SEED_ROWS.map((row, index) => ({
    id: `rank-${row.trailId}`,
    user_id: MOCK_USER_ID,
    trail_id: row.trailId,
    hike_type: DEFAULT_HIKE_TYPE,
    bucket: row.bucket,
    position: SEED_KEYS[index] ?? `a${index}`,
    comparison_count: row.comparisons,
    updated_at: new Date().toISOString(),
  })),
);

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
