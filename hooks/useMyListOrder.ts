import { useMemo } from 'react';

import { order, serverListRows } from '@/lib/listPlace';
import { useRankingStore } from '@/stores/rankingStore';

/**
 * Your rank for any trail, from your whole list as the server holds it.
 * Unlike useMyRankedTrails it doesn't need the trail's name cached on this
 * phone, so "You: #5" matches your own page. Sorted once per change, not per row.
 */
export function useMyRank(): (trailId: string) => number | null {
  const rankings = useRankingStore((s) => s.rankings);
  return useMemo(() => {
    const ranks = new Map(order(serverListRows(rankings)).map((row, index) => [row.trail_id, index + 1]));
    return (trailId: string) => ranks.get(trailId) ?? null;
  }, [rankings]);
}
