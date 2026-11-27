import { apiError } from '@/lib/apiError';
import { mapChallengeRow, type ChallengeBoardRow } from '@/lib/challenges';
import { deviceTimeZone } from '@/lib/groupRules';
import { supabase } from '@/lib/supabase';

function client() {
  if (!supabase) throw new Error('Challenges need the online version of Apex.');
  return supabase;
}

/** Keys of the challenges you've joined. */
export async function fetchMyChallenges(): Promise<string[]> {
  const { data, error } = await client().from('challenge_entries').select('challenge');
  if (error) throw apiError(error);
  return ((data ?? []) as { challenge?: unknown }[])
    .map((row) => (typeof row.challenge === 'string' ? row.challenge : ''))
    .filter((key) => key.length > 0);
}

export async function joinChallenge(userId: string, key: string): Promise<void> {
  const { error } = await client().from('challenge_entries').upsert({ user_id: userId, challenge: key }, { ignoreDuplicates: true });
  if (error) throw apiError(error);
}

export async function leaveChallenge(userId: string, key: string): Promise<void> {
  const { error } = await client().from('challenge_entries').delete().eq('user_id', userId).eq('challenge', key);
  if (error) throw apiError(error);
}

/** You and the friends who joined, by amount. */
export async function fetchChallengeBoard(key: string): Promise<ChallengeBoardRow[]> {
  const { data, error } = await client().rpc('challenge_board', { ch: key, tz: deviceTimeZone() });
  if (error) throw apiError(error);
  return ((data ?? []) as Record<string, unknown>[])
    .map(mapChallengeRow)
    .filter((row): row is ChallengeBoardRow => row !== null);
}
