import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  FEED_PAGE_SIZE,
  fetchComments,
  fetchFeedPage,
  fetchPersonPage,
  fetchPost,
  type FeedPost,
  type PostComment,
} from '@/lib/feed';
import { apiError } from '@/lib/apiError';
import { appendComment, dropComment, mapPosts, tempId, withCommentDelta, withLike } from '@/lib/optimistic';
import { M, type CommentAddVars, type LikeVars } from '@/lib/queryClient';
import { LIMITS, sanitizeText } from '@/lib/sanitize';

export const feedKey = (uid: string | null) => ['feed', uid] as const;

const feedPages = {
  queryFn: ({ pageParam }: { pageParam: string | null }) => fetchFeedPage(pageParam),
  initialPageParam: null as string | null,
  getNextPageParam: (last: FeedPost[]) =>
    last.length < FEED_PAGE_SIZE ? undefined : (last[last.length - 1]?.postedAt ?? undefined),
};

/**
 * Starts loading the feed while the opening screen plays, so Home is already
 * full when it appears.
 */
export function usePrefetchFeed() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  useEffect(() => {
    if (uid) void queryClient.prefetchInfiniteQuery({ queryKey: feedKey(uid), ...feedPages }).catch(() => undefined);
  }, [queryClient, uid]);
}

/** Home's feed, a page at a time. */
export function useFeed() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useInfiniteQuery({
    queryKey: feedKey(uid),
    ...feedPages,
    enabled: uid !== null,
  });
  return {
    uid,
    posts: query.data?.pages.flat() ?? [],
    loading: uid !== null && query.isPending,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    loadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
  };
}

/**
 * One person's posts for their page. Keyed under "feed" so likes made here
 * or on Home update both at once.
 */
export function usePersonPosts(person: string | undefined, enabled: boolean) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useInfiniteQuery({
    queryKey: ['feed', 'person', uid, person],
    queryFn: ({ pageParam }: { pageParam: string | null }) => fetchPersonPage(person as string, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: FeedPost[]) =>
      last.length < FEED_PAGE_SIZE ? undefined : (last[last.length - 1]?.postedAt ?? undefined),
    enabled: enabled && uid !== null && Boolean(person),
  });
  return {
    posts: query.data?.pages.flat() ?? [],
    loading: enabled && uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
  };
}

export function usePost(id: string | undefined) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id as string),
    enabled: Boolean(id) && session !== null,
    // Opened from the feed: show the feed's copy at once, then refresh.
    placeholderData: () => {
      for (const [, data] of queryClient.getQueriesData<InfiniteData<FeedPost[]>>({ queryKey: ['feed'] })) {
        const found = data?.pages.flat().find((post) => post.id === id);
        if (found) return found;
      }
      return undefined;
    },
  });
  return {
    post: query.data ?? null,
    loading: Boolean(id) && session !== null && query.isPending,
    error: query.error ? query.error.message : null,
  };
}

/** Like or unlike, shown at once. Queued while offline; rolled back only if the server refuses. */
export function useLike() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;

  const apply = (postId: string, liked: boolean) => {
    queryClient.setQueriesData<InfiniteData<FeedPost[]>>({ queryKey: ['feed'] }, (data) =>
      mapPosts(data, (p) => (p.id === postId ? withLike(p, liked) : p)) as InfiniteData<FeedPost[]> | undefined,
    );
    queryClient.setQueryData<FeedPost | null>(['post', postId], (post) => (post ? withLike(post, liked) : post));
  };
  const mutation = useMutation<void, Error, LikeVars>({
    mutationKey: M.like,
    onMutate: ({ postId, liked }) => apply(postId, liked),
    onError: (error, { postId, liked }) => {
      apply(postId, !liked);
      Alert.alert('Couldn’t update your like', apiError(error).message);
    },
  });
  return (post: FeedPost) => {
    if (!uid) return;
    mutation.mutate({ postId: post.id, userId: uid, liked: !post.liked });
  };
}

export type ShownComment = PostComment & { pending?: boolean };

export function useComments(postId: string | undefined) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const me = queryClient.getQueryData<{ username: string; display_name: string } | null>(['profile', uid]);
  const query = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId as string),
    enabled: Boolean(postId) && uid !== null,
  });

  const bumpCount = (id: string, delta: number) => {
    queryClient.setQueriesData<InfiniteData<FeedPost[]>>({ queryKey: ['feed'] }, (data) =>
      mapPosts(data, (p) => (p.id === id ? withCommentDelta(p, delta) : p)) as InfiniteData<FeedPost[]> | undefined,
    );
    queryClient.setQueryData<FeedPost | null>(['post', id], (post) => (post ? withCommentDelta(post, delta) : post));
  };

  const add = useMutation<void, Error, CommentAddVars>({
    mutationKey: M.commentAdd,
    onMutate: ({ postId: id, body, localId }) => {
      queryClient.setQueryData<ShownComment[]>(['comments', id], (list) =>
        appendComment(list, {
          id: localId,
          userId: uid as string,
          username: me?.username ?? 'you',
          displayName: me?.display_name ?? 'You',
          body,
          createdAt: new Date().toISOString(),
          pending: true,
        }),
      );
      bumpCount(id, 1);
    },
    onError: (error, { postId: id, localId }) => {
      queryClient.setQueryData<ShownComment[]>(['comments', id], (list) => dropComment(list, localId));
      bumpCount(id, -1);
      Alert.alert('Couldn’t post your comment', apiError(error).message);
    },
  });
  const remove = useMutation<void, Error, { id: string; postId: string }, ShownComment[] | undefined>({
    mutationKey: M.commentDelete,
    onMutate: ({ id, postId: pid }) => {
      const before = queryClient.getQueryData<ShownComment[]>(['comments', pid]);
      queryClient.setQueryData<ShownComment[]>(['comments', pid], (list) => dropComment(list, id));
      bumpCount(pid, -1);
      return before;
    },
    onError: (error, { postId: pid }, before) => {
      queryClient.setQueryData(['comments', pid], before);
      bumpCount(pid, 1);
      Alert.alert('Couldn’t delete the comment', apiError(error).message);
    },
  });

  return {
    uid,
    comments: (query.data ?? []) as ShownComment[],
    loading: Boolean(postId) && uid !== null && query.isPending && query.data === undefined,
    error: query.error ? query.error.message : null,
    /** Shows the comment at once; it goes out now, or when back online. */
    add: (body: string) => {
      const text = sanitizeText(body, LIMITS.comment);
      if (!text || !postId || !uid) return;
      add.mutate({ postId, userId: uid, body: text, localId: tempId() });
    },
    remove: (id: string) => {
      if (postId && !id.startsWith('local-')) remove.mutate({ id, postId });
    },
  };
}
