import {
  mapFriendship,
  usernamePrefixPattern,
  type Friendship,
  type PersonSummary,
} from '@/lib/friendRules';
import { supabase } from '@/lib/supabase';

export * from '@/lib/friendRules';

function client() {
  if (!supabase) throw new Error('Friends need the online version of Apex.');
  return supabase;
}

export async function fetchFriendships(): Promise<Friendship[]> {
  const { data, error } = await client().rpc('my_friendships');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapFriendship)
    .filter((row): row is Friendship => row !== null);
}

export async function searchPeople(query: string, myId: string): Promise<PersonSummary[]> {
  const pattern = usernamePrefixPattern(query);
  if (!pattern) return [];
  const { data, error } = await client()
    .from('profiles')
    .select('id, username, display_name')
    .like('username', pattern)
    .neq('id', myId)
    .order('username')
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonSummary[];
}

export async function fetchPerson(id: string): Promise<PersonSummary | null> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PersonSummary | null) ?? null;
}

export async function fetchFriendCount(id: string): Promise<number> {
  const { data, error } = await client().rpc('friend_count', { person: id });
  if (error) throw new Error(error.message);
  return typeof data === 'number' ? data : Number(data ?? 0);
}

/** 'requested', 'accepted' (they'd already asked you) or 'friends'. */
export async function sendFriendRequest(target: string): Promise<string> {
  const { data, error } = await client().rpc('send_friend_request', { target });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function respondToRequest(requester: string, accept: boolean): Promise<void> {
  const { error } = await client().rpc('respond_friend_request', { requester, accept });
  if (error) throw new Error(error.message);
}

/** Unfriend, or cancel a request you sent. */
export async function removeFriend(other: string): Promise<void> {
  const { error } = await client().rpc('remove_friend', { other });
  if (error) throw new Error(error.message);
}

/** Opens Apex on that person's page. Uses the app's own link scheme until universal links exist. */
export function friendInvitePath(id: string): string {
  return `/friend/${id}`;
}
