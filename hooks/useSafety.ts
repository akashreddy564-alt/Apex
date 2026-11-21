import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { fetchBlocked, type ReportInput } from '@/lib/safety';
import { apiError } from '@/lib/apiError';
import type { FeedPost } from '@/lib/feed';
import type { Friendship, PersonSummary } from '@/lib/friends';
import { withoutAuthor } from '@/lib/optimistic';
import { M } from '@/lib/queryClient';

/** Everything a block or unblock changes: friends, feed, comments, groups, the bell. */
const AFFECTED = ['friendships', 'feed', 'post', 'comments', 'groups', 'groupBoard', 'notifications', 'unread', 'blocked'];

export function useSafetyActions() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all(AFFECTED.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  };
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  // Blocking hides them everywhere at once; the server catches up (or the refetch after it does).
  const block = useMutation<void, Error, { id: string }>({
    mutationKey: M.block,
    onMutate: ({ id }) => {
      queryClient.setQueriesData<InfiniteData<FeedPost[]>>({ queryKey: ['feed'] }, (data) =>
        withoutAuthor(data, id) as InfiniteData<FeedPost[]> | undefined,
      );
      queryClient.setQueryData<Friendship[]>(['friendships', uid], (rows) => rows?.filter((row) => row.id !== id));
    },
    onError: (error) => {
      void refresh();
      Alert.alert('Couldn’t block them', apiError(error).message);
    },
  });
  const unblock = useMutation<void, Error, { id: string }, PersonSummary[] | undefined>({
    mutationKey: M.unblock,
    onMutate: ({ id }) => {
      const before = queryClient.getQueryData<PersonSummary[]>(['blocked', uid]);
      queryClient.setQueryData<PersonSummary[]>(['blocked', uid], (list) => list?.filter((p) => p.id !== id));
      return before;
    },
    onError: (error, _v, before) => {
      queryClient.setQueryData(['blocked', uid], before);
      Alert.alert('Couldn’t unblock them', apiError(error).message);
    },
  });
  const report = useMutation<void, Error, ReportInput>({
    mutationKey: M.report,
    onError: (error) => Alert.alert('Your report didn’t go through', apiError(error).message),
  });
  return {
    block: (id: string) => block.mutate({ id }),
    unblock: (id: string) => unblock.mutate({ id }),
    /** Queued if offline; a refusal shows an alert. */
    report: (input: ReportInput) => report.mutate(input),
  };
}

export function useBlocked() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({ queryKey: ['blocked', uid], queryFn: fetchBlocked, enabled: uid !== null });
  return {
    people: query.data ?? [],
    loading: uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
  };
}
