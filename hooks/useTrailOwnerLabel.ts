import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { friendshipsKey } from '@/hooks/useFriends';
import { useAuth } from '@/hooks/useAuth';
import { fetchFriendships, groupFriendships } from '@/lib/friends';
import { trailOwnerLabel } from '@/lib/friendTrails';
import { queryClient } from '@/lib/queryClient';
import type { Trail } from '@/types/trail';

/**
 * Labels for friends' trails ("Added by Sam"). Passes the app's query client
 * explicitly, so screens rendered without a provider (tests) still work.
 */
export function useTrailOwnerLabels(): (trail: Pick<Trail, 'source' | 'owner_id'>) => string | null {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const query = useQuery(
    { queryKey: friendshipsKey(uid), queryFn: fetchFriendships, enabled: uid !== null },
    queryClient,
  );
  const rows = query.data;
  return useCallback(
    (trail) => trailOwnerLabel(trail, uid, groupFriendships(rows ?? []).friends),
    [rows, uid],
  );
}
