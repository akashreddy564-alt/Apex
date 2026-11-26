import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import {
  fetchPersonRankings,
  fetchTasteMatch,
  fetchTastePicks,
  fetchTrailBoard,
  type TrailBoardKind,
} from '@/lib/rankLists';
import { useRankingStore } from '@/stores/rankingStore';

/**
 * Bumps whenever your own rankings change, so lists, boards and taste
 * numbers that include you refetch after you re-rank.
 */
function useMyRankingsStamp(): string {
  return useRankingStore((s) => s.rankings.map((r) => `${r.trail_id}:${r.score}`).join(','));
}

function shape<T>(query: { data: T | undefined; isPending: boolean; error: Error | null; refetch: () => unknown }, on: boolean, empty: T) {
  return {
    data: query.data ?? empty,
    loading: on && query.data === undefined && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}

export function usePersonRankings(person: string, enabled: boolean) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const stamp = useMyRankingsStamp();
  const on = enabled && uid !== null;
  const query = useQuery({
    // Your own list changes when you re-rank; other people's don't depend on you.
    queryKey: ['personRankings', uid, person, person === uid ? stamp : ''],
    queryFn: () => fetchPersonRankings(person),
    enabled: on,
    placeholderData: keepPreviousData,
  });
  return shape(query, on, []);
}

export function useTrailBoard(kind: TrailBoardKind, id?: string) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const stamp = useMyRankingsStamp();
  const on = uid !== null && (kind === 'friends' || Boolean(id));
  const query = useQuery({
    queryKey: ['trailBoard', uid, kind, id ?? null, stamp],
    queryFn: () => fetchTrailBoard(kind, id),
    enabled: on,
    placeholderData: keepPreviousData,
  });
  return shape(query, on, []);
}

export function useTasteMatch(person: string, enabled: boolean) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const stamp = useMyRankingsStamp();
  const on = enabled && uid !== null && person !== uid;
  const query = useQuery({
    queryKey: ['tasteMatch', uid, person, stamp],
    queryFn: () => fetchTasteMatch(person),
    enabled: on,
  });
  return shape(query, on, null);
}

export function useTastePicks() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const stamp = useMyRankingsStamp();
  const on = uid !== null;
  const query = useQuery({
    queryKey: ['tastePicks', uid, stamp],
    queryFn: () => fetchTastePicks(10),
    enabled: on,
    staleTime: 5 * 60_000,
  });
  return shape(query, on, []);
}
