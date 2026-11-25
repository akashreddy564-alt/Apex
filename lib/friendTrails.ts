import { MOCK_USER_ID } from '../data/mockTrails.ts';
import type { Trail } from '@/types/trail';

/**
 * A trail a friend added. It came down in the pull because they're your
 * friend (or you've hiked or ranked it), and only they can write it.
 * Trails made before sign-in carry the mock owner and are yours.
 */
export function isFriendTrail(trail: Pick<Trail, 'source' | 'owner_id'>, myId: string | null): boolean {
  if (!myId || trail.source !== 'user' || !trail.owner_id) return false;
  return trail.owner_id !== myId && trail.owner_id !== MOCK_USER_ID;
}

/**
 * After a pull: a friend's trail the server no longer returns (they unfriended
 * or blocked you) goes, unless it's in `keep` (queued writes, or a hike of
 * yours points at it).
 */
export function dropUnreadableFriendTrails(
  trails: Trail[],
  remoteIds: Set<string>,
  myId: string | null,
  keep: Set<string>,
): Trail[] {
  return trails.filter(
    (trail) => !isFriendTrail(trail, myId) || remoteIds.has(trail.id) || keep.has(trail.id),
  );
}

/** "Added by Sam" on a friend's trail, or null for yours and the catalog's. */
export function trailOwnerLabel(
  trail: Pick<Trail, 'source' | 'owner_id'>,
  myId: string | null,
  friends: { id: string; display_name: string }[],
): string | null {
  if (!isFriendTrail(trail, myId)) return null;
  const friend = friends.find((person) => person.id === trail.owner_id);
  const first = friend?.display_name.trim().split(/\s+/)[0];
  return first ? `Added by ${first}` : 'Added by a hiker';
}
