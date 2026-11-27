import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMyProfile } from '@/hooks/useProfile';
import { dayKey, puzzleFor, streakFrom } from '@/lib/switchback';
import { fetchSwitchbackDay } from '@/lib/switchbackRemote';
import { useSwitchback } from '@/stores/switchbackStore';

export const switchbackDayKey = (day: string) => ['switchback-day', day] as const;

/** Today's puzzle, whether you've solved it, your time and your streak. */
export function useTodaySwitchback() {
  const today = dayKey(new Date());
  const solved = useSwitchback((s) => s.solved);
  const shared = useSwitchback((s) => s.shared[today] === true);
  return useMemo(() => {
    const puzzle = puzzleFor(today);
    const seconds = solved[today] ?? null;
    return { today, puzzle, seconds, shared, streak: streakFrom(Object.keys(solved), today) };
  }, [shared, solved, today]);
}

/** Friends' shared results for a day (and yours), for the feed card and the finish screen. */
export function useSwitchbackDay(day: string) {
  const { session } = useMyProfile();
  return useQuery({
    queryKey: switchbackDayKey(day),
    queryFn: () => fetchSwitchbackDay(day),
    enabled: Boolean(session),
    staleTime: 60_000,
  });
}
