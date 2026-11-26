import { useMemo } from 'react';

import { yourStatsByTrail, type YourTrailStats } from '@/lib/yourTrailStats';
import { useTrailCache } from '@/stores/trailCache';

/** Your numbers for every trail you've hiked (your most recent hike on each). */
export function useYourStatsByTrail(): Map<string, YourTrailStats> {
  const logs = useTrailCache((s) => s.logs);
  return useMemo(() => yourStatsByTrail(logs), [logs]);
}

/** Your numbers for one trail, or null: "Not hiked yet". */
export function useYourTrailStats(trailId: string): YourTrailStats | null {
  return useYourStatsByTrail().get(trailId) ?? null;
}
