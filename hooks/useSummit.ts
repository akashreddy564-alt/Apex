import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { HERO_PLACES } from '@/data/heroPlaces';
import { useMyProfile } from '@/hooks/useProfile';
import { fetchSummitDay } from '@/lib/dailyRemote';
import { dayKey, placeFor, stateOf, streakFrom, type SummitPlace } from '@/lib/summit';
import { useSummit } from '@/stores/summitStore';

export const summitDayKey = (day: string) => ['summit-day', day] as const;

/** Every place you can guess, A to Z. */
export const SUMMIT_PLACES: readonly SummitPlace[] = [...HERO_PLACES]
  .map((p) => ({ id: p.id, name: p.name, elevationM: p.elevationM, region: p.region, country: p.country }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Today's place, your guesses, how it's going and your streak. */
export function useTodaySummit() {
  const today = dayKey(new Date());
  const games = useSummit((s) => s.games);
  const shared = useSummit((s) => s.shared[today] === true);
  return useMemo(() => {
    const answer = placeFor(today, SUMMIT_PLACES);
    const guesses = games[today] ?? [];
    const state = stateOf(guesses, answer.id);
    const wonDays = Object.entries(games)
      .filter(([day, g]) => g.includes(placeFor(day, SUMMIT_PLACES).id))
      .map(([day]) => day);
    return { today, answer, guesses, state, shared, streak: streakFrom(wonDays, today) };
  }, [games, shared, today]);
}

/** Friends' shared scores for a day (and yours), for the feed card and the result screen. */
export function useSummitDay(day: string) {
  const { session } = useMyProfile();
  return useQuery({
    queryKey: summitDayKey(day),
    queryFn: () => fetchSummitDay(day),
    enabled: Boolean(session),
    staleTime: 60_000,
  });
}
