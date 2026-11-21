/**
 * What the screen should show the moment someone taps, before the server
 * answers. Each function takes cached data and returns the next version;
 * the caller rolls back to the snapshot if the write is refused.
 * Pure, so it runs under node tests.
 */

import type { Friendship, PersonSummary } from './friendRules.ts';
import type { BoardRow } from './groupRules.ts';
import type { FeedPost } from './postRules.ts';

export type FriendAction = 'add' | 'accept' | 'decline' | 'remove';

/**
 * Sending a request to someone who already asked you makes you friends,
 * the same as send_friend_request() does on the server.
 */
export function applyFriendAction(
  rows: readonly Friendship[],
  person: PersonSummary,
  action: FriendAction,
  now: string,
): Friendship[] {
  const existing = rows.find((row) => row.id === person.id);
  const others = rows.filter((row) => row.id !== person.id);
  if (action === 'decline' || action === 'remove') return others;
  if (action === 'accept' || existing?.relation === 'incoming' || existing?.relation === 'friend') {
    return [{ ...person, relation: 'friend', since: existing?.since || now }, ...others];
  }
  return [...others, { ...person, relation: 'outgoing', since: now }];
}

/** Feed pages as TanStack's infinite query keeps them. */
export interface Pages<T> {
  pages: T[][];
  pageParams: unknown[];
}

export function mapPosts(data: Pages<FeedPost> | undefined, fn: (post: FeedPost) => FeedPost | null) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => page.map(fn).filter((post): post is FeedPost => post !== null)),
  };
}

/** Blocking someone hides their posts at once. */
export function withoutAuthor(data: Pages<FeedPost> | undefined, authorId: string) {
  return mapPosts(data, (post) => (post.authorId === authorId ? null : post));
}

export function withLike(post: FeedPost, liked: boolean): FeedPost {
  if (post.liked === liked) return post;
  return { ...post, liked, likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)) };
}

export function withCommentDelta(post: FeedPost, delta: number): FeedPost {
  return { ...post, commentCount: Math.max(0, post.commentCount + delta) };
}

export interface CommentLike {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  body: string;
  createdAt: string;
  /** Shown faded until the server has it. */
  pending?: boolean;
}

/** A local id, kept until the server's list replaces it. */
export function tempId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendComment<T extends CommentLike>(list: readonly T[] | undefined, comment: T): T[] {
  return [...(list ?? []), comment];
}

export function dropComment<T extends CommentLike>(list: readonly T[] | undefined, id: string): T[] {
  return (list ?? []).filter((comment) => comment.id !== id);
}

/** Removing a member re-numbers the places below them. */
export function withoutMember(rows: readonly BoardRow[] | undefined, userId: string): BoardRow[] {
  const kept = (rows ?? []).filter((row) => row.userId !== userId);
  let place = 0;
  let lastGain: number | null = null;
  return kept.map((row, i) => {
    if (row.gainM !== lastGain) place = i + 1;
    lastGain = row.gainM;
    return { ...row, place };
  });
}
