import { apiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';

export interface DailyResult {
  userId: string;
  displayName: string;
  avatarPath: string | null;
  /** 1-6, or 7 for didn't get it. */
  guesses: number;
  isMe: boolean;
}

/** Share today's Summit score with friends and followers (migration 034). Once per day. */
export async function shareSummit(day: string, guesses: number): Promise<void> {
  if (!supabase) throw new Error('Sharing needs an account.');
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Sign in to share with friends.');
  const { error } = await supabase
    .from('daily_results')
    .upsert({ user_id: uid, game: 'summit', puzzle_date: day, guesses }, { onConflict: 'user_id,game,puzzle_date', ignoreDuplicates: true });
  if (error) throw apiError(error);
}

/** Summit scores shared for a day by you and the people you see, best first. Empty before 034 or signed out. */
export async function fetchSummitDay(day: string): Promise<DailyResult[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('daily_results_day', { game_name: 'summit', day });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row: Record<string, unknown>) =>
    typeof row.user_id === 'string' && typeof row.guesses === 'number'
      ? [
          {
            userId: row.user_id,
            displayName: String(row.display_name ?? row.username ?? ''),
            avatarPath: typeof row.avatar_path === 'string' ? row.avatar_path : null,
            guesses: row.guesses,
            isMe: row.is_me === true,
          },
        ]
      : [],
  );
}
