import { useEffect, useState } from 'react';

import { pullRemote, type SyncResult } from '@/lib/remoteSync';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useTrailCache } from '@/stores/trailCache';

/**
 * When Supabase is configured and a session exists, hydrate local caches
 * from the server. Local mock data stays in place until that succeeds.
 */
export function useRemoteSync() {
  const [result, setResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    let queued = false;
    const run = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        void pullRemote().then((next) => {
          if (!cancelled) setResult(next);
        });
      });
    };

    const unsubHydrate = useTrailCache.persist.onFinishHydration(run);
    if (useTrailCache.persist.hasHydrated()) run();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        run();
      }
    });

    return () => {
      cancelled = true;
      unsubHydrate();
      data.subscription.unsubscribe();
    };
  }, []);

  return result;
}
