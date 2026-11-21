import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  createGroup,
  fetchBoard,
  fetchMyGroups,
  fetchSummary,
  joinGroup,
  type BoardRow,
  type Group,
  type GroupColor,
  type Period,
} from '@/lib/groups';
import { apiError } from '@/lib/apiError';
import { withoutMember } from '@/lib/optimistic';
import { M } from '@/lib/queryClient';

export const myGroupsKey = (uid: string | null) => ['groups', uid] as const;

/** Your groups with your place this week. Empty while signed out. */
export function useMyGroups() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({ queryKey: myGroupsKey(uid), queryFn: fetchMyGroups, enabled: uid !== null });
  return {
    groups: query.data ?? [],
    loading: uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}

/** One group's board and stat cards for a period. */
export function useGroupPage(groupId: string, period: Period) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const enabled = uid !== null && groupId.length > 0;
  const board = useQuery({
    queryKey: ['groupBoard', uid, groupId, period],
    queryFn: () => fetchBoard(groupId, period),
    enabled,
    // Switching week/month/year keeps the last board up until the new one lands.
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: ['groupSummary', uid, groupId, period],
    queryFn: () => fetchSummary(groupId, period),
    enabled,
    placeholderData: keepPreviousData,
  });
  return {
    board: board.data ?? [],
    summary: summary.data ?? null,
    loading: enabled && board.data === undefined && summary.data === undefined && (board.isPending || summary.isPending),
    refreshing: board.isRefetching || summary.isRefetching,
    error: board.error?.message ?? summary.error?.message ?? null,
    refetch: async () => {
      await Promise.all([board.refetch(), summary.refetch()]);
    },
  };
}

/** Create, join, leave and remove. Each refreshes groups and boards. */
export function useGroupActions() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['groupBoard'] }),
      queryClient.invalidateQueries({ queryKey: ['groupSummary'] }),
    ]);
  };
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const create = useMutation({
    mutationFn: ({ name, color }: { name: string; color: GroupColor }) => createGroup(name, color),
    onSuccess: refresh,
  });
  const join = useMutation({ mutationFn: joinGroup, onSuccess: refresh });
  // Leaving and removing show at once and queue offline; undone only if refused.
  const leave = useMutation<void, Error, { groupId: string }, Group[] | undefined>({
    mutationKey: M.leaveGroup,
    onMutate: ({ groupId }) => {
      const before = queryClient.getQueryData<Group[]>(myGroupsKey(uid));
      queryClient.setQueryData<Group[]>(myGroupsKey(uid), (list) => (list ?? []).filter((g) => g.id !== groupId));
      return before;
    },
    onError: (error, _v, before) => {
      queryClient.setQueryData(myGroupsKey(uid), before);
      Alert.alert('Couldn’t leave the group', apiError(error).message);
    },
  });
  const remove = useMutation<void, Error, { groupId: string; member: string }, [readonly unknown[], BoardRow[] | undefined][]>({
    mutationKey: M.removeMember,
    onMutate: ({ groupId, member }) => {
      const before = queryClient.getQueriesData<BoardRow[]>({ queryKey: ['groupBoard', uid, groupId] });
      queryClient.setQueriesData<BoardRow[]>({ queryKey: ['groupBoard', uid, groupId] }, (rows) => withoutMember(rows, member));
      return before;
    },
    onError: (error, _v, before) => {
      for (const [key, rows] of before ?? []) queryClient.setQueryData(key, rows);
      Alert.alert('Couldn’t remove them', apiError(error).message);
    },
  });
  return {
    /** Resolves to the new group's id. Errors are the caller's to show inline. */
    create: (name: string, color: GroupColor) => create.mutateAsync({ name, color }),
    creating: create.isPending,
    join: (code: string) => join.mutateAsync(code),
    joining: join.isPending,
    leave: (groupId: string) => leave.mutate({ groupId }),
    remove: (groupId: string, member: string) => remove.mutate({ groupId, member }),
  };
}

/** Start loading a group's page on press-in, so it opens full. */
export function usePrefetchGroup() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  return (groupId: string) => {
    if (!uid) return;
    void queryClient.prefetchQuery({ queryKey: ['groupBoard', uid, groupId, 'week'], queryFn: () => fetchBoard(groupId, 'week') });
    void queryClient.prefetchQuery({ queryKey: ['groupSummary', uid, groupId, 'week'], queryFn: () => fetchSummary(groupId, 'week') });
  };
}
