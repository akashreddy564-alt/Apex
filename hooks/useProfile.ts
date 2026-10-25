import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { fetchProfile } from '@/lib/profile';

export const profileKey = (id: string | null) => ['profile', id] as const;

/** The signed-in hiker's profile. `profile` is null until they pick a username. */
export function useMyProfile() {
  const auth = useAuth();
  const uid = auth.session?.user.id ?? null;
  const query = useQuery({
    queryKey: profileKey(uid),
    queryFn: () => fetchProfile(uid as string),
    enabled: uid !== null,
  });
  return {
    ...auth,
    uid,
    profile: query.data ?? null,
    loading: !auth.ready || (uid !== null && query.isPending),
    error: query.error ? query.error.message : null,
    refetch: query.refetch,
  };
}
