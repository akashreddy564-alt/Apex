import { apiError } from '@/lib/apiError';
import { supabase } from '@/lib/supabase';

export interface SwitchbackResult {
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  seconds: number;
  size: number;
  isMe: boolean;
}

/** Share today's time with friends and followers (migration 034). One per day; sharing twice is fine. */
export async function shareSwitchback(day: string, seconds: number, size: number): Promise<void> {
  if (!supabase) throw new Error('Sharing needs an account.');
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Sign in to share with friends.');
  const { error } = await supabase
    .from('switchback_results')
    .upsert({ user_id: uid, puzzle_date: day, seconds: Math.max(1, Math.round(seconds)), size }, { onConflict: 'user_id,puzzle_date', ignoreDuplicates: true });
  if (error) throw apiError(error);
}

/** Results shared for a day by you and the people you see, fastest first. Empty before 034 or signed out. */
export async function fetchSwitchbackDay(day: string): Promise<SwitchbackResult[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('switchback_day', { day });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row: Record<string, unknown>) =>
    typeof row.user_id === 'string' && typeof row.seconds === 'number'
      ? [
          {
            userId: row.user_id,
            username: String(row.username ?? ''),
            displayName: String(row.display_name ?? row.username ?? ''),
            avatarPath: typeof row.avatar_path === 'string' ? row.avatar_path : null,
            seconds: row.seconds,
            size: Number(row.size ?? 0),
            isMe: row.is_me === true,
          },
        ]
      : [],
  );
}
