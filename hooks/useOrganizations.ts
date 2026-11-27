import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import type { Period } from '@/lib/groupRules';
import {
  confirmOrgCode,
  createOrganization,
  fetchMyOrganizations,
  fetchOrgBoard,
  fetchPersonOrgs,
  leaveOrganization,
  requestOrgCode,
  type OrgKind,
} from '@/lib/organizations';

export const myOrgsKey = (uid: string | null) => ['organizations', uid] as const;

/** Your verified schools and companies with your place this week. */
export function useMyOrganizations() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({ queryKey: myOrgsKey(uid), queryFn: fetchMyOrganizations, enabled: uid !== null });
  return {
    organizations: query.data ?? [],
    loading: uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}

/** One organization's board for a period. */
export function useOrgBoard(orgId: string, period: Period) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const enabled = uid !== null && orgId.length > 0;
  const query = useQuery({
    queryKey: ['orgBoard', uid, orgId, period],
    queryFn: () => fetchOrgBoard(orgId, period),
    enabled,
    placeholderData: keepPreviousData,
  });
  return {
    board: query.data ?? [],
    loading: enabled && query.data === undefined && query.isPending,
    refreshing: query.isRefetching,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}

/** Send a code, check it, name a new organization, leave one. */
export function useOrgActions() {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      queryClient.invalidateQueries({ queryKey: ['orgBoard'] }),
      queryClient.invalidateQueries({ queryKey: ['personOrgs'] }),
    ]);
  };
  const send = useMutation({ mutationFn: requestOrgCode });
  const confirm = useMutation({
    mutationFn: confirmOrgCode,
    onSuccess: async (result) => {
      if (result.status === 'joined') await refresh();
    },
  });
  const create = useMutation({
    mutationFn: ({ name, kind }: { name: string; kind: OrgKind }) => createOrganization(name, kind),
    onSuccess: refresh,
  });
  const leave = useMutation({ mutationFn: leaveOrganization, onSuccess: refresh });
  return {
    sendCode: (email: string) => send.mutateAsync(email),
    sending: send.isPending,
    confirm: (code: string) => confirm.mutateAsync(code),
    confirming: confirm.isPending,
    create: (name: string, kind: OrgKind) => create.mutateAsync({ name, kind }),
    creating: create.isPending,
    leave: (orgId: string) => leave.mutateAsync(orgId),
    leaving: leave.isPending,
  };
}

/** A person's verified school or company names, for the line under their @username. */
export function usePersonOrgs(personId: string | null | undefined): string[] {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['personOrgs', uid, personId],
    queryFn: () => fetchPersonOrgs(personId!),
    enabled: uid !== null && Boolean(personId),
    staleTime: 10 * 60 * 1000,
  });
  return query.data ?? [];
}
