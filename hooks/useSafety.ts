import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { blockPerson, fetchBlocked, sendReport, unblockPerson, type ReportInput } from '@/lib/safety';

/** Everything a block or unblock changes: friends, feed, comments, groups, the bell. */
const AFFECTED = ['friendships', 'feed', 'post', 'comments', 'groups', 'groupBoard', 'notifications', 'unread', 'blocked'];

export function useSafetyActions() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all(AFFECTED.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  };
  const onError = (error: Error) => Alert.alert('Something went wrong', error.message);
  const block = useMutation({ mutationFn: blockPerson, onSuccess: refresh, onError });
  const unblock = useMutation({ mutationFn: unblockPerson, onSuccess: refresh, onError });
  const report = useMutation({ mutationFn: (input: ReportInput) => sendReport(input) });
  return {
    block: (id: string) => block.mutateAsync(id),
    unblock: (id: string) => unblock.mutate(id),
    unblockingFor: unblock.isPending ? (unblock.variables ?? null) : null,
    /** Resolves when sent; errors are the caller's to show. */
    report: (input: ReportInput) => report.mutateAsync(input),
    reporting: report.isPending,
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
