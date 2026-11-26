import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { apiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';

/** Someone who ranked a trail: a friend, or someone you follow. */
export interface PersonRanking {
  personId: string;
  username: string;
  displayName: string | null;
  bucket: 'loved' | 'fine' | 'disliked';
  score: number;
  difficulty: number | null;
  isFriend: boolean;
}

export interface FollowCounts {
  followers: number;
  following: number;
  iFollow: boolean;
  followsMe: boolean;
}

export interface FollowPerson {
  id: string;
  username: string;
  displayName: string | null;
  iFollow: boolean;
}

export type FollowKind = 'followers' | 'following';

const num = (value: unknown) => (typeof value === 'number' ? value : Number(value) || 0);

/** Friends' and followed people's rankings of one trail (migration 024). Empty signed out. */
export function useTrailPeopleRankings(trailId: string) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['trailPeopleRankings', uid, trailId],
    enabled: uid !== null && supabase !== null && trailId !== '',
    queryFn: async (): Promise<PersonRanking[]> => {
      const { data, error } = await supabase!.rpc('trail_people_rankings', { trail: trailId });
      if (error) throw error;
      return (Array.isArray(data) ? data : []).flatMap((row: Record<string, unknown>) => {
        const bucket = row.bucket;
        if (bucket !== 'loved' && bucket !== 'fine' && bucket !== 'disliked') return [];
        return [
          {
            personId: String(row.person_id),
            username: String(row.username ?? ''),
            displayName: typeof row.display_name === 'string' ? row.display_name : null,
            bucket,
            score: num(row.score),
            difficulty: typeof row.difficulty === 'number' ? row.difficulty : null,
            isFriend: row.is_friend === true,
          },
        ];
      });
    },
  });
  return { people: query.data ?? [], loading: uid !== null && query.isPending };
}

/** Followers and following counts for a person, and whether you follow them. */
export function useFollowCounts(personId: string | null) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['followCounts', uid, personId],
    enabled: uid !== null && supabase !== null && personId != null,
    queryFn: async (): Promise<FollowCounts> => {
      const { data, error } = await supabase!.rpc('follow_counts', { person: personId });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
      return {
        followers: num(row?.followers),
        following: num(row?.following),
        iFollow: row?.i_follow === true,
        followsMe: row?.follows_me === true,
      };
    },
  });
  return { counts: query.data ?? null, loading: uid !== null && query.isPending };
}

/** The people who follow `personId`, or whom they follow. */
export function useFollowList(personId: string, kind: FollowKind) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['followList', uid, personId, kind],
    enabled: uid !== null && supabase !== null,
    queryFn: async (): Promise<FollowPerson[]> => {
      const { data, error } = await supabase!.rpc('follow_list', { person: personId, kind, max_rows: 200 });
      if (error) throw error;
      return (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        username: String(row.username ?? ''),
        displayName: typeof row.display_name === 'string' ? row.display_name : null,
        iFollow: row.i_follow === true,
      }));
    },
  });
  return { people: query.data ?? [], loading: uid !== null && query.isPending, refetch: query.refetch };
}

/** Follow or unfollow someone; counts, lists and the feed refresh after. */
export function useFollowToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ personId, follow }: { personId: string; follow: boolean }) => {
      if (!supabase) return;
      const { error } = await supabase.rpc(follow ? 'follow_person' : 'unfollow_person', { person: personId });
      if (error) throw error;
    },
    // Returned, so the button stays on its new state until the counts have refreshed.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['followCounts'] }),
        queryClient.invalidateQueries({ queryKey: ['followList'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
        queryClient.invalidateQueries({ queryKey: ['trailPeopleRankings'] }),
      ]),
    onError: (error) => Alert.alert('Couldn’t update', apiError(error).message),
  });
}
