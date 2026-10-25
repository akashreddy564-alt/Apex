import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import {
  addComment,
  deleteComment,
  FEED_PAGE_SIZE,
  fetchComments,
  fetchFeedPage,
  fetchPost,
  setLiked,
  type FeedPost,
} from '@/lib/feed';

export const feedKey = (uid: string | null) => ['feed', uid] as const;

/** Home's feed, a page at a time. */
export function useFeed() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useInfiniteQuery({
    queryKey: feedKey(uid),
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.length < FEED_PAGE_SIZE ? undefined : (last[last.length - 1]?.postedAt ?? undefined),
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
  };
}

export function usePost(id: string | undefined) {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id as string),
    enabled: Boolean(id) && session !== null,
  });
  return {
    post: query.data ?? null,
    loading: Boolean(id) && session !== null && query.isPending,
    error: query.error ? query.error.message : null,
  };
}

function patchPost(post: FeedPost, liked: boolean): FeedPost {
  if (post.liked === liked) return post;
  return { ...post, liked, likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)) };
}

/** Like or unlike, shown at once and rolled back if the server says no. */
export function useLike() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;

  const apply = (postId: string, liked: boolean) => {
    queryClient.setQueriesData<InfiniteData<FeedPost[]>>({ queryKey: ['feed'] }, (data) =>
      data
        ? { ...data, pages: data.pages.map((page) => page.map((p) => (p.id === postId ? patchPost(p, liked) : p))) }
        : data,
    );
    queryClient.setQueryData<FeedPost | null>(['post', postId], (post) => (post ? patchPost(post, liked) : post));
  };

  const mutation = useMutation({
    mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
      setLiked(postId, uid as string, liked),
    onMutate: ({ postId, liked }) => apply(postId, liked),
    onError: (error: Error, { postId, liked }) => {
      apply(postId, !liked);
      Alert.alert('Couldn’t update your like', error.message);
    },
  });

  return (post: FeedPost) => {
    if (!uid) return;
    mutation.mutate({ postId: post.id, liked: !post.liked });
  };
}

export function useComments(postId: string | undefined) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId as string),
    enabled: Boolean(postId) && uid !== null,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    await queryClient.invalidateQueries({ queryKey: ['post', postId] });
    await queryClient.invalidateQueries({ queryKey: ['feed'] });
  };
  const add = useMutation({
    mutationFn: (body: string) => addComment(postId as string, uid as string, body),
    onSuccess: refresh,
    onError: (error: Error) => Alert.alert('Couldn’t post your comment', error.message),
  });
  const remove = useMutation({
    mutationFn: deleteComment,
    onSuccess: refresh,
    onError: (error: Error) => Alert.alert('Couldn’t delete the comment', error.message),
  });
  return {
    uid,
    comments: query.data ?? [],
    loading: Boolean(postId) && uid !== null && query.isPending,
    error: query.error ? query.error.message : null,
    add: (body: string) => add.mutateAsync(body),
    adding: add.isPending,
    remove: (id: string) => remove.mutate(id),
  };
}
