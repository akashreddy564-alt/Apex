import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_USER_ID } from '@/data/mockTrails';
import { DEFAULT_ELO } from '@/lib/elo';
import type { TrailRanking } from '@/types/trail';

/** Seed a few ranked trails so pairwise ranking is immediately demoable. */
const SEED_RANKINGS: TrailRanking[] = [
  {
    id: 'rank-trail-halfdome',
    user_id: MOCK_USER_ID,
    trail_id: 'trail-halfdome',
    elo_rating: 1280,
    rank_score: 1280,
    ordinal_rank: 1,
    comparison_count: 4,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rank-trail-diablo',
    user_id: MOCK_USER_ID,
    trail_id: 'trail-diablo',
    elo_rating: 1180,
    rank_score: 1180,
    ordinal_rank: 2,
    comparison_count: 3,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rank-trail-tam',
    user_id: MOCK_USER_ID,
    trail_id: 'trail-tam',
    elo_rating: 1120,
    rank_score: 1120,
    ordinal_rank: 3,
    comparison_count: 3,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rank-trail-raineer',
    user_id: MOCK_USER_ID,
    trail_id: 'trail-raineer',
    elo_rating: 1080,
    rank_score: 1080,
    ordinal_rank: 4,
    comparison_count: 2,
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rank-trail-mission',
    user_id: MOCK_USER_ID,
    trail_id: 'trail-mission',
    elo_rating: 1040,
    rank_score: 1040,
    ordinal_rank: 5,
    comparison_count: 2,
    updated_at: new Date().toISOString(),
  },
];

interface RankingState {
  rankings: TrailRanking[];
  getRanking: (trailId: string) => TrailRanking | undefined;
  upsertRanking: (ranking: TrailRanking) => void;
  setRankings: (rankings: TrailRanking[]) => void;
  ensureRanking: (trailId: string) => TrailRanking;
  recomputeOrdinals: () => void;
}

function sortByScore(rankings: TrailRanking[]): TrailRanking[] {
  return [...rankings].sort((a, b) => b.rank_score - a.rank_score);
}

export const useRankingStore = create<RankingState>()(
  persist(
    (set, get) => ({
      rankings: SEED_RANKINGS,
      getRanking: (trailId) => get().rankings.find((r) => r.trail_id === trailId),
      upsertRanking: (ranking) => {
        set((state) => {
          const without = state.rankings.filter(
            (r) => !(r.user_id === ranking.user_id && r.trail_id === ranking.trail_id),
          );
          return { rankings: sortByScore([...without, ranking]) };
        });
        get().recomputeOrdinals();
      },
      setRankings: (rankings) => {
        set({ rankings: sortByScore(rankings) });
        get().recomputeOrdinals();
      },
      ensureRanking: (trailId) => {
        const existing = get().getRanking(trailId);
        if (existing) return existing;
        const created: TrailRanking = {
          id: `rank-${trailId}`,
          user_id: MOCK_USER_ID,
          trail_id: trailId,
          elo_rating: DEFAULT_ELO,
          rank_score: DEFAULT_ELO,
          ordinal_rank: null,
          comparison_count: 0,
          updated_at: new Date().toISOString(),
        };
        get().upsertRanking(created);
        return created;
      },
      recomputeOrdinals: () => {
        set((state) => ({
          rankings: sortByScore(state.rankings).map((r, index) => ({
            ...r,
            ordinal_rank: index + 1,
          })),
        }));
      },
    }),
    {
      name: 'apex-rankings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ rankings: s.rankings }),
    },
  ),
);
