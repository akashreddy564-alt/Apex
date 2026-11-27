import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useTrailCache } from '@/stores/trailCache';

export const TOUR_SEEN_KEY = 'apex-home-tour-seen';

/**
 * Whether to run the Home tour: once per install, and only for someone with
 * no hikes yet. `ready` is when the opening photo has finished.
 */
export function useHomeTour(ready: boolean): { show: boolean; done: () => void } {
  const [seen, setSeen] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then((value) => {
        if (!cancelled) setSeen(value === '1');
      })
      .catch(() => {
        if (!cancelled) setSeen(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasHikes = useTrailCache((s) => s.logs.length > 0);
  const done = useCallback(() => {
    setDismissed(true);
    void AsyncStorage.setItem(TOUR_SEEN_KEY, '1').catch(() => undefined);
  }, []);

  return { show: ready && seen === false && !hasHikes && !dismissed, done };
}
