import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  fetchFriendCount,
  fetchFriendships,
  fetchPerson,
  groupFriendships,
  relationTo,
  removeFriend,
  respondToRequest,
  searchPeople,
  sendFriendRequest,
} from '@/lib/friends';

export const friendshipsKey = (uid: string | null) => ['friendships', uid] as const;

/** Your friends and requests. Empty while signed out. */
export function useFriendships() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: friendshipsKey(uid),
    queryFn: fetchFriendships,
    enabled: uid !== null,
  });
  const rows = query.data ?? [];
  return {
    uid,
    rows,
    ...groupFriendships(rows),
    relationTo: (personId: string) => relationTo(rows, personId, uid),
    loading: uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}

/** Send, accept, decline, cancel and unfriend. Each refreshes the list. */
export function useFriendActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['friendships'] });
  const onError = (error: Error) => Alert.alert('Something went wrong', error.message);
  const add = useMutation({ mutationFn: sendFriendRequest, onSuccess: refresh, onError });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondToRequest(id, accept),
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['friendCount'] });
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: removeFriend,
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ['friendCount'] });
    },
    onError,
  });
  return {
    add: (id: string) => add.mutate(id),
    accept: (id: string) => respond.mutate({ id, accept: true }),
    decline: (id: string) => respond.mutate({ id, accept: false }),
    remove: (id: string) => remove.mutate(id),
    /** The person a request is in flight for, so only their button shows busy. */
    pendingFor:
      (add.isPending ? add.variables : null) ??
      (respond.isPending ? respond.variables?.id : null) ??
      (remove.isPending ? remove.variables : null) ??
      null,
  };
}

/** Username search, 250 ms after typing stops. */
export function usePeopleSearch(query: string) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const term = debounced.trim();
  const result = useQuery({
    queryKey: ['peopleSearch', uid, term],
    queryFn: () => searchPeople(term, uid as string),
    enabled: uid !== null && term.length > 0,
    staleTime: 10_000,
  });
  return {
    people: term.length > 0 ? (result.data ?? []) : [],
    searching: term.length > 0 && (result.isFetching || debounced !== query),
    error: result.error ? result.error.message : null,
  };
}

export function usePerson(id: string | undefined) {
  const { session } = useAuth();
  const enabled = Boolean(id) && session !== null;
  const person = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id as string),
    enabled,
  });
  const count = useQuery({
    queryKey: ['friendCount', id],
    queryFn: () => fetchFriendCount(id as string),
    enabled,
  });
  return {
    person: person.data ?? null,
    friendCount: count.data ?? null,
    loading: enabled && person.isPending,
    error: person.error ? person.error.message : null,
  };
}
