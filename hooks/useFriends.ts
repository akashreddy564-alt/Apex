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
  searchPeople,
  type Friendship,
  type PersonSummary,
} from '@/lib/friends';
import { apiError } from '@/lib/apiError';
import { applyFriendAction } from '@/lib/optimistic';
import { M, type FriendVars } from '@/lib/queryClient';

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

/**
 * Send, accept, decline, cancel and unfriend. The button flips the moment
 * it's tapped; the write goes out now or when back online, and is undone
 * only if the server refuses it.
 */
export function useFriendActions() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const mutation = useMutation<void, Error, FriendVars & { person: PersonSummary }, Friendship[] | undefined>({
    mutationKey: M.friend,
    onMutate: async ({ person, action }) => {
      await queryClient.cancelQueries({ queryKey: friendshipsKey(uid) });
      const before = queryClient.getQueryData<Friendship[]>(friendshipsKey(uid));
      queryClient.setQueryData<Friendship[]>(friendshipsKey(uid), (rows) =>
        applyFriendAction(rows ?? [], person, action, new Date().toISOString()),
      );
      return before;
    },
    onError: (error, _vars, before) => {
      queryClient.setQueryData(friendshipsKey(uid), before);
      Alert.alert('Something went wrong', apiError(error).message);
    },
  });
  const run = (action: FriendVars['action']) => (person: PersonSummary) =>
    mutation.mutate({ personId: person.id, action, person });
  return {
    add: run('add'),
    accept: run('accept'),
    decline: run('decline'),
    remove: run('remove'),
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
  const queryClient = useQueryClient();
  const person = useQuery({
    queryKey: ['person', id],
    queryFn: () => fetchPerson(id as string),
    enabled,
    // Opened from a list we already have: show them at once, then refresh.
    placeholderData: () => {
      for (const [, rows] of queryClient.getQueriesData<PersonSummary[]>({ queryKey: ['friendships'] })) {
        const found = rows?.find((row) => row.id === id);
        if (found) return { id: found.id, username: found.username, display_name: found.display_name };
      }
      for (const [, rows] of queryClient.getQueriesData<PersonSummary[]>({ queryKey: ['peopleSearch'] })) {
        const found = rows?.find((row) => row.id === id);
        if (found) return found;
      }
      return undefined;
    },
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
