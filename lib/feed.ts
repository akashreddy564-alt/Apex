import { mapFeedPost, type FeedPost } from '@/lib/postRules';
import { supabase } from '@/lib/supabase';

export * from '@/lib/postRules';

export const FEED_PAGE_SIZE = 15;

function client() {
  if (!supabase) throw new Error('The feed needs the online version of Apex.');
  return supabase;
}

function rows(data: unknown): FeedPost[] {
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapFeedPost)
    .filter((post): post is FeedPost => post !== null);
}

/** Your and your friends' posts, newest first, older than `before` when given. */
export async function fetchFeedPage(before: string | null): Promise<FeedPost[]> {
  const { data, error } = await client().rpc('feed_posts', {
    before,
    max_rows: FEED_PAGE_SIZE,
    only_post: null,
  });
  if (error) throw new Error(error.message);
  return rows(data);
}

export async function fetchPost(id: string): Promise<FeedPost | null> {
  const { data, error } = await client().rpc('feed_posts', { before: null, max_rows: 1, only_post: id });
  if (error) throw new Error(error.message);
  return rows(data)[0] ?? null;
}

export async function setLiked(postId: string, userId: string, liked: boolean): Promise<void> {
  const table = client().from('post_likes');
  const { error } = liked
    ? await table.upsert({ post_id: postId, user_id: userId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true })
    : await table.delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export interface PostComment {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  body: string;
  createdAt: string;
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data, error } = await client()
    .from('post_comments')
    .select('id, user_id, body, created_at, author:profiles(username, display_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const author = (Array.isArray(row.author) ? row.author[0] : row.author) as
      | { username?: string; display_name?: string }
      | null;
    return {
      id: String(row.id),
      userId: String(row.user_id),
      username: author?.username ?? 'someone',
      displayName: author?.display_name ?? author?.username ?? 'Someone',
      body: String(row.body ?? ''),
      createdAt: String(row.created_at ?? ''),
    };
  });
}

export const COMMENT_MAX = 500;

export async function addComment(postId: string, userId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const { error } = await client()
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, body: text.slice(0, COMMENT_MAX) });
  if (error) throw new Error(error.message);
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await client().from('post_comments').delete().eq('id', commentId);
  if (error) throw new Error(error.message);
}
