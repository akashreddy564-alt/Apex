import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from '@/lib/safety';

/** The bell's dot. Checks every minute while the app is open. */
export function useUnreadCount() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['unread', uid],
    queryFn: fetchUnreadCount,
    enabled: uid !== null,
    refetchInterval: 60_000,
    // Before 013 has run the function is missing; a quiet bell is fine.
    retry: false,
  });
  return uid ? (query.data ?? 0) : 0;
}

export function useNotifications() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications', uid], queryFn: fetchNotifications, enabled: uid !== null });
  const markRead = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => queryClient.setQueryData(['unread', uid], 0),
  });
  return {
    notifications: query.data ?? [],
    loading: uid !== null && query.isPending,
    refreshing: query.isRefetching,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    markRead: () => markRead.mutate(),
  };
}
