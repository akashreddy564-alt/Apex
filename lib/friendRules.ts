import { normalizeUsername } from './username.ts';

/** How someone relates to you. Matches `my_friendships()` in 010_friends.sql, plus 'none' and 'self'. */
export type Relation = 'friend' | 'incoming' | 'outgoing' | 'none' | 'self';

export interface Friendship {
  id: string;
  username: string;
  display_name: string;
  relation: 'friend' | 'incoming' | 'outgoing';
  since: string;
}

export interface PersonSummary {
  id: string;
  username: string;
  display_name: string;
}

const RELATIONS = new Set(['friend', 'incoming', 'outgoing']);

export function mapFriendship(row: Record<string, unknown>): Friendship | null {
  if (typeof row.id !== 'string' || typeof row.username !== 'string') return null;
  if (typeof row.relation !== 'string' || !RELATIONS.has(row.relation)) return null;
  return {
    id: row.id,
    username: row.username,
    display_name: typeof row.display_name === 'string' ? row.display_name : row.username,
    relation: row.relation as Friendship['relation'],
    since: String(row.since ?? ''),
  };
}

/** Friends, then requests to you, then requests you sent. */
export function groupFriendships(rows: Friendship[]) {
  return {
    friends: rows.filter((row) => row.relation === 'friend'),
    incoming: rows.filter((row) => row.relation === 'incoming'),
    outgoing: rows.filter((row) => row.relation === 'outgoing'),
  };
}

export function relationTo(rows: Friendship[], personId: string, myId: string | null): Relation {
  if (personId === myId) return 'self';
  return rows.find((row) => row.id === personId)?.relation ?? 'none';
}

/** Escapes LIKE wildcards so "a_b" matches only "a_b…". */
export function usernamePrefixPattern(query: string): string | null {
  const name = normalizeUsername(query);
  if (name.length === 0 || !/^[a-z0-9_]+$/.test(name)) return null;
  return `${name.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}
