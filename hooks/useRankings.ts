import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { pushRankings } from '@/lib/remoteSync';
import {
  BUCKET_BANDS,
  BUCKETS,
  DEFAULT_HIKE_TYPE,
  overallByScore,
  rankingsToSync,
  sortByPosition,
  withStoredScores,
  type Bucket,
} from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';
import type { LeaderboardEntry, TrailRanking } from '@/types/trail';

const RANKINGS_KEY = ['rankings'] as const;

export interface BucketSection {
  bucket: Bucket;
  label: string;
  /** Hikes in this bucket. The row label uses this, not a recomputed score. */
  count: number;
  entries: LeaderboardEntry[];
}

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

  const sections: BucketSection[] = useMemo(() => {
    return BUCKETS.map((bucket) => {
      const group = sortByPosition(
        rankings.filter(
          (row) => row.bucket === bucket && row.hike_type === DEFAULT_HIKE_TYPE,
        ),
      );
      const entries = overallByScore(group).flatMap((ranking, index) => {
        const trail = trails.find((item) => item.id === ranking.trail_id);
        if (!trail) return [];
        return [
          {
            trail,
            ranking,
            score: ranking.score,
            ordinal: index + 1,
          },
        ];
      });
      return { bucket, label: BUCKET_BANDS[bucket].label, count: group.length, entries };
    }).filter((section) => section.entries.length > 0);
  }, [rankings, trails]);

  const overall: LeaderboardEntry[] = useMemo(() => {
    return overallByScore(rankings).flatMap((ranking, index) => {
      const trail = trails.find((item) => item.id === ranking.trail_id);
      if (!trail) return [];
      return [
        {
          trail,
          ranking,
          score: ranking.score,
          ordinal: index + 1,
        },
      ];
    });
  }, [rankings, trails]);

  const leaderboard = useMemo(
    () => sections.flatMap((section) => section.entries),
    [sections],
  );

  const optimisticUpsert = useMutation({
    mutationFn: async (ranking: TrailRanking) => {
      const before = useRankingStore.getState().rankings;
      upsertRanking(ranking);
      const after = useRankingStore.getState().rankings;
      await pushRankings(rankingsToSync(before, after));
      return ranking;
    },
    onMutate: async (ranking) => {
      await queryClient.cancelQueries({ queryKey: RANKINGS_KEY });
      const previous = queryClient.getQueryData<TrailRanking[]>(RANKINGS_KEY);
      queryClient.setQueryData<TrailRanking[]>(RANKINGS_KEY, (old = []) => {
        const without = old.filter(
          (row) =>
            !(row.trail_id === ranking.trail_id && row.hike_type === ranking.hike_type),
        );
        return withStoredScores([...without, ranking]);
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
    sections,
    overall,
    leaderboard,
    isLoading: query.isLoading,
    optimisticUpsert,
  };
}
