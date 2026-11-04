import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  createGroup,
  fetchBoard,
  fetchMyGroups,
  fetchSummary,
  joinGroup,
  leaveGroup,
  removeMember,
  type GroupColor,
  type Period,
} from '@/lib/groups';

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
  });
  const summary = useQuery({
    queryKey: ['groupSummary', uid, groupId, period],
    queryFn: () => fetchSummary(groupId, period),
    enabled,
  });
  return {
    board: board.data ?? [],
    summary: summary.data ?? null,
    loading: enabled && (board.isPending || summary.isPending),
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
  const onError = (error: Error) => Alert.alert('Something went wrong', error.message);
  const create = useMutation({
    mutationFn: ({ name, color }: { name: string; color: GroupColor }) => createGroup(name, color),
    onSuccess: refresh,
  });
  const join = useMutation({ mutationFn: joinGroup, onSuccess: refresh });
  const leave = useMutation({ mutationFn: leaveGroup, onSuccess: refresh, onError });
  const remove = useMutation({
    mutationFn: ({ groupId, member }: { groupId: string; member: string }) => removeMember(groupId, member),
    onSuccess: refresh,
    onError,
  });
  return {
    /** Resolves to the new group's id. Errors are the caller's to show inline. */
    create: (name: string, color: GroupColor) => create.mutateAsync({ name, color }),
    creating: create.isPending,
    join: (code: string) => join.mutateAsync(code),
    joining: join.isPending,
    leave: (groupId: string) => leave.mutateAsync(groupId),
    leaving: leave.isPending,
    remove: (groupId: string, member: string) => remove.mutate({ groupId, member }),
    removingFor: remove.isPending ? (remove.variables?.member ?? null) : null,
  };
}
