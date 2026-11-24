import {
  deviceTimeZone,
  mapBoardRow,
  mapGroup,
  mapSummary,
  normalizeCode,
  type BoardRow,
  type Group,
  type GroupColor,
  type GroupSummary,
  type Period,
} from '@/lib/groupRules';
import { supabase } from '@/lib/supabase';
import { apiError } from '@/lib/apiError';
import { LIMITS, sanitizeText } from '@/lib/sanitize';

export * from '@/lib/groupRules';

function client() {
  if (!supabase) throw new Error('Groups need the online version of Apex.');
  return supabase;
}

function list<T>(data: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
  return ((data ?? []) as Record<string, unknown>[]).map(map).filter((row): row is T => row !== null);
}

export async function fetchMyGroups(): Promise<Group[]> {
  const { data, error } = await client().rpc('my_groups');
  if (error) throw apiError(error);
  return list(data, mapGroup);
}

export async function fetchBoard(groupId: string, period: Period): Promise<BoardRow[]> {
  const { data, error } = await client().rpc('group_board', { g: groupId, period });
  if (error) throw apiError(error);
  return list(data, mapBoardRow);
}

export async function fetchSummary(groupId: string, period: Period): Promise<GroupSummary | null> {
  const { data, error } = await client().rpc('group_summary', { g: groupId, period });
  if (error) throw apiError(error);
  return mapSummary(((data ?? []) as Record<string, unknown>[])[0]);
}

/** Returns the new group's id. Its week runs in this phone's time zone. */
export async function createGroup(name: string, color: GroupColor): Promise<string> {
  const { data, error } = await client().rpc('create_group', {
    group_name: sanitizeText(name, LIMITS.groupName),
    group_color: color,
    tz: deviceTimeZone(),
  });
  if (error) throw apiError(error);
  return String(data);
}

/** Returns the group's id, also when you were already in it. */
export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await client().rpc('join_group', { join_code: normalizeCode(code) });
  if (error) throw apiError(error);
  // 014 returns null for a wrong code (raising would undo the counted try).
  if (data == null) throw new Error('No group has that code');
  return String(data);
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await client().rpc('leave_group', { g: groupId });
  if (error) throw apiError(error);
}

export async function removeMember(groupId: string, member: string): Promise<void> {
  const { error } = await client().rpc('remove_group_member', { g: groupId, member });
  if (error) throw apiError(error);
}

/** Opens Apex on Join with the code filled in. The code shown beside it is the fallback. */
export function groupInvitePath(code: string): string {
  return `/join-group?code=${code}`;
}

/** You and your friends by recorded climb, in this phone's time zone. */
export async function fetchFriendBoard(period: Period): Promise<BoardRow[]> {
  const { data, error } = await client().rpc('friend_board', { period, tz: deviceTimeZone() });
  if (error) throw apiError(error);
  return list(data, mapBoardRow);
}
