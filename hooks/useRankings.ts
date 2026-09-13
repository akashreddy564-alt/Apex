import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type { LeaderboardEntry, TrailRanking } from '@/types/trail';

const RANKINGS_KEY = ['rankings'] as const;

export function useRankings() {
  const queryClient = useQueryClient();
  const rankings = useRankingStore((s) => s.rankings);
  const setRankings = useRankingStore((s) => s.setRankings);
  const upsertRanking = useRankingStore((s) => s.upsertRanking);
  const trails = useTrailCache((s) => s.trails);

  const query = useQuery({
    queryKey: RANKINGS_KEY,
    queryFn: async () => rankings,
    initialData: rankings,
  });

  const leaderboard: LeaderboardEntry[] = useMemo(() => {
    return [...rankings]
      .sort((a, b) => b.rank_score - a.rank_score)
      .map((ranking) => {
        const trail = trails.find((t) => t.id === ranking.trail_id);
        if (!trail) return null;
        return { trail, ranking };
      })
      .filter((e): e is LeaderboardEntry => e !== null);
  }, [rankings, trails]);

  const top10 = useMemo(() => leaderboard.slice(0, 10), [leaderboard]);

  const optimisticUpsert = useMutation({
    mutationFn: async (ranking: TrailRanking) => {
      upsertRanking(ranking);
      return ranking;
    },
    onMutate: async (ranking) => {
      await queryClient.cancelQueries({ queryKey: RANKINGS_KEY });
      const previous = queryClient.getQueryData<TrailRanking[]>(RANKINGS_KEY);
      queryClient.setQueryData<TrailRanking[]>(RANKINGS_KEY, (old = []) => {
        const without = old.filter((r) => r.trail_id !== ranking.trail_id);
        return [...without, ranking].sort((a, b) => b.rank_score - a.rank_score);
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(RANKINGS_KEY, ctx.previous);
        setRankings(ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RANKINGS_KEY });
    },
  });

  return {
    rankings: query.data ?? rankings,
    leaderboard,
    top10,
    isLoading: query.isLoading,
    optimisticUpsert,
  };
}
