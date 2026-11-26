import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useFollowList } from '@/hooks/useFollows';
import { useFriendships } from '@/hooks/useFriends';

export interface Taggable {
  id: string;
  username: string;
  displayName: string;
}

/**
 * People you can tag on a hike: friends, and people you follow who follow you
 * back (migration 027 drops anyone else). Friends first, then by name.
 */
export function useTaggable(): Taggable[] {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { friends } = useFriendships();
  const following = useFollowList(me, 'following').people;
  const followers = useFollowList(me, 'followers').people;
  return useMemo(() => {
    const out = new Map<string, Taggable>();
    for (const f of friends) out.set(f.id, { id: f.id, username: f.username, displayName: f.display_name || f.username });
    const backers = new Set(followers.map((p) => p.id));
    const mutual = following.filter((p) => backers.has(p.id)).sort((a, b) => (a.displayName ?? a.username).localeCompare(b.displayName ?? b.username));
    for (const p of mutual) if (!out.has(p.id)) out.set(p.id, { id: p.id, username: p.username, displayName: p.displayName || p.username });
    return [...out.values()];
  }, [friends, following, followers]);
}
