import { useQuery } from '@tanstack/react-query';

import { ascentRoster } from '@/lib/firstAscent';
import { supabase } from '@/lib/supabase';

const ROSTER_KEY = ['first-ascent-roster'] as const;

/**
 * Everyone with a First Ascent number: at most 100 rows, fetched once and
 * shared by every badge. Before migration 021 there's no column; the query
 * fails quietly and nobody shows a badge.
 */
function useRoster() {
  return useQuery({
    queryKey: ROSTER_KEY,
    enabled: Boolean(supabase),
    // Numbers never change, so a full roster keeps for an hour. An empty one
    // (signed out, or before 021) is asked again next time a badge mounts.
    staleTime: (query) => (query.state.data && Object.keys(query.state.data).length ? 60 * 60 * 1000 : 0),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase!.from('profiles').select('id, ascent_no').not('ascent_no', 'is', null);
      // A plain object, not a Map: the query cache is saved as JSON, and a Map comes back as {}.
      if (error) return {} as Record<string, number>;
      return Object.fromEntries(ascentRoster((data ?? []) as { id?: unknown; ascent_no?: unknown }[]));
    },
  });
}

/** This person's First Ascent number, or null. */
export function useFirstAscent(userId: string | null | undefined): number | null {
  const { data } = useRoster();
  if (!userId || !data || typeof data !== 'object') return null;
  const n = (data as Record<string, unknown>)[userId];
  return typeof n === 'number' ? n : null;
}
