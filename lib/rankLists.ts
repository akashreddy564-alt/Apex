import { apiError } from '@/lib/apiError';
import {
  mapBoardTrail,
  mapRankedRow,
  mapTasteMatch,
  mapTastePick,
  type BoardTrail,
  type RankedRow,
  type TasteMatch,
  type TastePick,
} from '@/lib/rankListRules';
import { supabase } from '@/lib/supabase';

export * from '@/lib/rankListRules';

export type TrailBoardKind = 'friends' | 'group' | 'org';

function client() {
  if (!supabase) throw new Error('Lists need the online version of Apex.');
  return supabase;
}

function rows<T>(data: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
  return ((data ?? []) as Record<string, unknown>[]).map(map).filter((row): row is T => row !== null);
}

/** Someone's whole list, best first. Empty when you can't see their hikes. */
export async function fetchPersonRankings(person: string): Promise<RankedRow[]> {
  const { data, error } = await client().rpc('person_rankings', { person });
  if (error) throw apiError(error);
  return rows(data, mapRankedRow);
}

/** Top trails for your friends, a group, or a school or company. */
export async function fetchTrailBoard(kind: TrailBoardKind, id?: string): Promise<BoardTrail[]> {
  const call =
    kind === 'friends'
      ? client().rpc('friends_trail_board')
      : kind === 'group'
        ? client().rpc('group_trail_board', { g: id })
        : client().rpc('organization_trail_board', { o: id });
  const { data, error } = await call;
  if (error) throw apiError(error);
  return rows(data, mapBoardTrail);
}

export async function fetchTasteMatch(person: string): Promise<TasteMatch | null> {
  const { data, error } = await client().rpc('taste_match', { person });
  if (error) throw apiError(error);
  return mapTasteMatch((data ?? []) as Record<string, unknown>[]);
}

export async function fetchTastePicks(maxRows = 10): Promise<TastePick[]> {
  const { data, error } = await client().rpc('taste_picks', { max_rows: maxRows });
  if (error) throw apiError(error);
  return rows(data, mapTastePick);
}
