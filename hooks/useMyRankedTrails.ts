import { useMemo } from 'react';

import type { MyRankedTrail } from '@/lib/postRules';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { useRankingStore } from '@/stores/rankingStore';
import { useTrailCache } from '@/stores/trailCache';

/** Your ranked trails with names, for "Ranked above your Mount Si" tags. */
export function useMyRankedTrails(): MyRankedTrail[] {
  const rankings = useRankingStore((s) => s.rankings);
  const trails = useTrailCache((s) => s.trails);
  return useMemo(() => {
    const names = new Map(trails.map((trail) => [trail.id, trail.name]));
    return rankings.flatMap((row) => {
      const name = names.get(row.trail_id);
      if (row.hike_type !== DEFAULT_HIKE_TYPE || !name) return [];
      return [{ trailId: row.trail_id, name, bucket: row.bucket, score: row.score }];
    });
  }, [rankings, trails]);
}
