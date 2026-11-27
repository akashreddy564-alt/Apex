import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { fetchChallengeBoard, fetchMyChallenges, joinChallenge, leaveChallenge } from '@/lib/challengeRemote';

const mineKey = (uid: string | null) => ['challenges', uid] as const;

/** The challenge keys you've joined. Empty when signed out. */
export function useMyChallenges() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({ queryKey: mineKey(uid), queryFn: fetchMyChallenges, enabled: uid !== null });
  return { joined: new Set(query.data ?? []), signedIn: uid !== null, loading: uid !== null && query.isPending };
}

/** Join or leave, updating the list at once and settling with the server. */
export function useChallengeToggle() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, join }: { key: string; join: boolean }) => {
      if (!uid) throw new Error('Sign in to join challenges.');
      if (join) await joinChallenge(uid, key);
      else await leaveChallenge(uid, key);
    },
    onMutate: async ({ key, join }) => {
      await queryClient.cancelQueries({ queryKey: mineKey(uid) });
      const before = queryClient.getQueryData<string[]>(mineKey(uid)) ?? [];
      const next = join ? [...new Set([...before, key])] : before.filter((k) => k !== key);
      queryClient.setQueryData(mineKey(uid), next);
      return { before };
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(mineKey(uid), context.before);
    },
    onSettled: (_data, _error, { key }) => {
      void queryClient.invalidateQueries({ queryKey: mineKey(uid) });
      void queryClient.invalidateQueries({ queryKey: ['challengeBoard', uid, key] });
    },
  });
}

/** You and the friends who joined this challenge. */
export function useChallengeBoard(key: string, enabled = true) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const on = enabled && uid !== null && key.length > 0;
  const query = useQuery({ queryKey: ['challengeBoard', uid, key], queryFn: () => fetchChallengeBoard(key), enabled: on });
  return {
    rows: query.data ?? [],
    loading: on && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}
