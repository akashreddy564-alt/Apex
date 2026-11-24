# Friends' trails (2026-11-24)

## Why

The owner: "there's no point in adding a trail if you can not rank it and it does not have the same functionality in the app as other trails." Small, unofficial trails should work like catalog trails for the people who hike them together.

## What is true today

- A trail added at Finish is a `trails` row with `source = 'user'` and `owner_id`. It can already be ranked (ranking never looks at `source`).
- RLS (`008`, `trails_select_catalog_or_own`) lets only the owner read it. So for friends:
  - In the feed they see its name (the feed RPC is `security definer`), but tapping does nothing, because the trail isn't in their local cache (`PostCard.tsx`).
  - Saving it stores an id they can't open, and the weekend pick drops it.
  - Trail matching at Finish (`lib/trailMatch.ts`) only sees the catalog and your own trails, so a friend who hikes the same path makes a second copy. The group "favorite trail" needs two rankers, so it never picks an added trail.

## Decision

**Friends only** (owner's pick). Your friends' added trails act like catalog trails for you. Strangers never see them.

Approaches considered:

- **Friends only (chosen).** It fits Apex being about your friends. Added trails often start at a home or a quiet local spot, which strangers shouldn't see.
- **Everyone.** Full parity with the catalog and one shared copy for everybody, but it exposes start points and invites junk names, so it would need reporting and moderation. Rejected.

## Goals

1. A friend's added trail can be opened (trail page, map, stats), saved, ranked and logged, the same as a catalog trail.
2. When you finish a hike near a friend's trail, Apex suggests it, so you join their trail instead of making a copy. The exact-name check when naming a new trail also sees friends' trails.
3. Feed cards for a friend's added trail open the trail page.
4. Group favorites can pick an added trail once two friends rank it (follows from 1 and 2).

## Non-goals

- No public or community trails, no moderation, no merging copies that already exist.
- No renaming or deleting trails in the app (it doesn't exist today).
- Leaderboard gain caps stay as they are. The extra 1.5× cap applies only to catalog trails; extending it is out of scope.

## Anti-goals

- A stranger, or someone who blocked you or whom you blocked, must never be able to read your added trail.
- Unfriending must not break hikes or rankings you already made on their trail.
- Deleting an account must not fail, and must not delete other people's hikes.

## Design

**Database: migration `019_friend_trails.sql`.**

- Replace the trails select policy. You can read a trail if any of these hold:
  - it's a catalog trail (`owner_id is null`)
  - you own it
  - the owner is your friend (`are_friends`) and neither has blocked the other (`is_blocked_between`)
  - you have a hike log or a ranking on it, so unfriending keeps your own history working
- Insert, update and delete stay owner-only.
- Account deletion: `hike_logs.trail_id` is `on delete restrict`, and `trails.owner_id` cascades from `auth.users`. So today, deleting an account whose trail a friend has logged would fail. Before the auth user is removed, `delete_own_account` hands each trail with other people's hikes to the earliest other hiker who logged it. Trails nobody else used are deleted as before.
- Add to `migration_status.sql`. Add SQL tests or a check script in the style of the existing ones.

**App.**

- Sync (`lib/remoteSync.ts`): the pull already reads `trails_api`, so friends' trails arrive in the cache with their `owner_id`. Pushing stays limited to trails you own (today it pushes every `source = 'user'` trail, so add an `owner_id === uid` check).
- Trail list order (`lib/catalogMerge.ts`): your own trails first, then friends' trails, then the catalog. Friends' trails that are no longer readable fall out on the next pull, unless a log points at them (same rule as old demo trails).
- Labels: where a trail shows "yours" today (`PastHikeSheet`, `TrailAssignSheet`, trails list, trail page), a friend's trail shows "Added by {first name}". The name comes from the friends list (`useFriendships`). If the person is no longer a friend, it shows "Added by a hiker".
- Matching and the name check need no new code. They read the local trail list, which now includes friends' trails.
- Feed tap-through and saving need no new code once the trail is cached. After a pull, check that the post opens.

## Constraints

- Typecheck, node tests and jest suites pass. Web at 390×844 for the label changes. No phone pass for this change.
- The owner applies `019` in Supabase (as with `016`–`018`).

## Left to the builder

- The exact SQL for the handover on delete, and the test harness for the policy.
- Where the "Added by" label sits in each component.
