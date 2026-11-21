import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';

import { isOffline } from '@/lib/apiError';
import { markOffline } from '@/lib/connectivity';
import { setLiked, addComment, deleteComment } from '@/lib/feed';
import { removeFriend, respondToRequest, sendFriendRequest } from '@/lib/friends';
import { leaveGroup, removeMember } from '@/lib/groups';
import { blockPerson, markNotificationsRead, sendReport, unblockPerson, type ReportInput } from '@/lib/safety';
import { supabase } from '@/lib/supabase';

const DAY_MS = 86_400_000;

/**
 * Every social write the app can queue, by key. Each takes plain,
 * serialisable variables, so a write made offline survives the app closing
 * and goes out after the next launch, even with no screen mounted.
 * Screens add the optimistic update (onMutate) and the rollback (onError);
 * the refetch afterwards lives here so it also runs for replayed writes.
 */
export const M = {
  like: ['like'],
  commentAdd: ['comment', 'add'],
  commentDelete: ['comment', 'delete'],
  friend: ['friend'],
  block: ['block'],
  unblock: ['unblock'],
  leaveGroup: ['group', 'leave'],
  removeMember: ['group', 'remove'],
  report: ['report'],
  markRead: ['notifications', 'read'],
} as const;

export type FriendVars = { personId: string; action: 'add' | 'accept' | 'decline' | 'remove' };
export type LikeVars = { postId: string; userId: string; liked: boolean };
export type CommentAddVars = { postId: string; userId: string; body: string; localId: string };

function makeClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isOffline(error)) markOffline();
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isOffline(error)) markOffline();
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Long enough to persist: screens open with what they showed last time.
        gcTime: 7 * DAY_MS,
        // Offline, show the cache instead of an error.
        networkMode: 'offlineFirst',
        retry: (count, error) => !isOffline(error) && count < 1,
      },
      mutations: {
        // A write that can't reach the network waits for it instead of failing.
        // markOffline() pauses the retry until a ping succeeds.
        retry: (count, error) => {
          if (!isOffline(error)) return false;
          markOffline();
          return count < 100;
        },
        retryDelay: 1_000,
      },
    },
  });

  const refresh =
    (...keys: string[]) =>
    () =>
      Promise.all(keys.map((key) => client.invalidateQueries({ queryKey: [key] })));

  client.setMutationDefaults(M.like, {
    mutationFn: ({ postId, userId, liked }: LikeVars) => setLiked(postId, userId, liked),
  });
  client.setMutationDefaults(M.commentAdd, {
    mutationFn: ({ postId, userId, body }: CommentAddVars) => addComment(postId, userId, body),
    onSettled: refresh('comments', 'post', 'feed'),
  });
  client.setMutationDefaults(M.commentDelete, {
    mutationFn: ({ id }: { id: string }) => deleteComment(id),
    onSettled: refresh('comments', 'post', 'feed'),
  });
  client.setMutationDefaults(M.friend, {
    mutationFn: async ({ personId, action }: FriendVars) => {
      if (action === 'add') await sendFriendRequest(personId);
      else if (action === 'accept' || action === 'decline') await respondToRequest(personId, action === 'accept');
      else await removeFriend(personId);
    },
    onSettled: refresh('friendships', 'friendCount', 'feed'),
  });
  client.setMutationDefaults(M.block, {
    mutationFn: ({ id }: { id: string }) => blockPerson(id),
    onSettled: refresh(
      'friendships',
      'feed',
      'post',
      'comments',
      'groups',
      'groupBoard',
      'notifications',
      'unread',
      'blocked',
    ),
  });
  client.setMutationDefaults(M.unblock, {
    mutationFn: ({ id }: { id: string }) => unblockPerson(id),
    onSettled: refresh('blocked', 'friendships'),
  });
  client.setMutationDefaults(M.leaveGroup, {
    mutationFn: ({ groupId }: { groupId: string }) => leaveGroup(groupId),
    onSettled: refresh('groups', 'groupBoard', 'groupSummary'),
  });
  client.setMutationDefaults(M.removeMember, {
    mutationFn: ({ groupId, member }: { groupId: string; member: string }) => removeMember(groupId, member),
    onSettled: refresh('groupBoard', 'groupSummary'),
  });
  client.setMutationDefaults(M.report, {
    mutationFn: (input: ReportInput) => sendReport(input),
  });
  client.setMutationDefaults(M.markRead, {
    mutationFn: () => markNotificationsRead(),
  });

  // Signing out wipes everything cached for that account, on screen and on disk.
  supabase?.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      client.cancelQueries();
      client.getMutationCache().clear();
      client.clear();
      void persister.removeClient();
    }
  });

  return client;
}

const isServer = typeof window === 'undefined';

const persister = createAsyncStoragePersister({
  storage: isServer ? undefined : AsyncStorage,
  key: 'apex-query-cache',
  throttleTime: 1_000,
});

/** Not worth keeping across launches. */
const EPHEMERAL = new Set(['peopleSearch', 'unread']);

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: 7 * DAY_MS,
  // Bump when a cached shape changes, so old caches are dropped instead of misread.
  buster: 'apex-1',
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === 'success' && !EPHEMERAL.has(String(query.queryKey[0])),
    // Paused (queued) writes are kept by default; that's the offline queue.
  },
};

export const queryClient = makeClient();
