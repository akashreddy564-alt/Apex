# Friends' trails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A friend's added trail works like a catalog trail for you: open, save, rank, log, and get it suggested at Finish.

**Architecture:** One RLS change lets friends (not blocked) read each other's `source = 'user'` trails, and keeps a trail readable for anyone who logged or ranked it. The app already pulls `trails_api` into the local cache, and matching, search, feed tap-through and saving all read that cache. So the client work is to not push trails you don't own, to drop friends' trails that stop being readable, and to label them "Added by …".

**Tech Stack:** Supabase Postgres (RLS, plpgsql), Expo / React Native, zustand, node:test, jest.

**Spec:** `docs/superpowers/specs/2026-11-24-friend-trails-design.md`

## Global Constraints

- Friends only. A stranger, or either side of a block, never reads someone else's added trail.
- Insert, update and delete on `trails` stay owner-only.
- Typecheck, `npm test` (node and jest) pass. Web at 390×844 for the labels. No phone pass.
- The owner applies `019` in Supabase.

## Review Focus

- **Logging a friend's trail while signed in:** `sendLog` pushes the trail first. An upsert of someone else's row fails RLS, so the log would never sync. `sendTrail` must treat a friend's trail as already synced. (Task 2 tests `isFriendTrail`. Task 3 wires it in.)
- **Unfriending:** `mergeById` keeps local rows the server no longer returns, so a friend's trail would stay forever. The pull drops friends' trails missing from the response, unless the trail is dirty or a local log points at it. (Task 2 test.)
- **Account deletion with friends' hikes on your trail:** today it fails on `hike_logs.trail_id on delete restrict`. Hand the trail over first. (Task 1.)
- **Trails created before sign-in:** they carry `MOCK_USER_ID`, so they must count as yours, not a friend's. (Task 2 test.)
- **A label for an ex-friend:** "Added by a hiker", never a raw id. (Task 2 test.)

---

### Task 1: Migration 019

**Files:**
- Create: `supabase/migrations/019_friend_trails.sql`
- Modify: `supabase/checks/migration_status.sql`: add row 25, `'019 friend trails'`, true when policy `trails_select_catalog_own_or_friend` exists in `pg_policies`.

- [ ] Drop `trails_select_catalog_or_own` and create `trails_select_catalog_own_or_friend` for `authenticated`. Readable when any of these hold: `owner_id is null`; you own it; `are_friends(uid, owner_id) and not is_blocked_between(uid, owner_id)`; or you have a `hike_logs` or `trail_rankings` row on it. Use `(select auth.uid())`.
- [ ] `create or replace function public.delete_own_account()`: the same body as `004`. Before `delete from auth.users`, set each of uid's trails that other people logged or ranked to the earliest other person to log it, falling back to the earliest ranking (`trail_rankings.updated_at`). Re-issue the revoke and grant lines.
- [ ] Commit.

### Task 2: `lib/friendTrails.ts`

**Files:**
- Create: `lib/friendTrails.ts`, `lib/friendTrails.test.ts`. Register the test in the `test` script in `package.json`.

**Interfaces (produces):**
- `isFriendTrail(trail: Pick<Trail,'source'|'owner_id'>, myId: string | null): boolean`. True only for `source === 'user'` with an `owner_id` that is neither `myId` nor `MOCK_USER_ID`. A null `myId` means signed out, so false.
- `dropUnreadableFriendTrails(trails: Trail[], remoteIds: Set<string>, myId: string | null, keep: Set<string>): Trail[]`. Removes friend trails not in `remoteIds` and not in `keep` (dirty ids plus trail ids that local logs point at).
- `trailOwnerLabel(trail, myId, friends: { id: string; display_name: string }[]): string | null`. Returns `null` unless it's a friend trail, `"Added by Sam"` (first word of the name) when the owner is in `friends`, and `"Added by a hiker"` otherwise.

- [ ] Tests:
  - mock-owner and own trails are not friend trails; a catalog trail is not; a null `myId` gives false.
  - drop: a stale friend trail is removed; it's kept if it's in remote, in `keep`, or if it's your own.
  - label: "Added by Sam" for "Sam Lee"; "Added by a hiker" for an unknown owner; null for your own.
- [ ] Run `node --experimental-strip-types --test lib/friendTrails.test.ts`. Expect it to fail, then implement, then expect a pass.
- [ ] Commit.

### Task 3: Sync

**Files:** Modify `lib/remoteSync.ts`.

- [ ] `sendTrail`: return `true` (nothing to send) when `isFriendTrail(trail, uid)`.
- [ ] First sign-in queue: only trails where `!isFriendTrail(trail, uid)`.
- [ ] `pullRemote`: after the trail merge, run `dropUnreadableFriendTrails` with remote ids, uid, and the dirty trail ids plus local log `trail_id`s. Skip it when `remoteTrails` is empty, as the merge does.
- [ ] Run `npm run typecheck` (or `npx tsc --noEmit`) and `npm test`. Commit.

### Task 4: "Added by" labels

**Files:**
- Create: `hooks/useTrailOwnerLabel.ts`: `useTrailOwnerLabel(trail: Trail | null | undefined): string | null`, built on `useFriendships()` (`uid`, `friends`) and `trailOwnerLabel`.
- Modify:
  - `components/log/TrailAssignSheet.tsx`: SuggestionCard, a line under the region.
  - `app/trail/[id].tsx`: next to where `CATALOG_CREDIT` shows.
  - `components/trail/TrailCoverCard.tsx`: an optional `addedBy?: string | null` prop shown in its meta. `app/trails.tsx` passes it.
- [ ] Typecheck, `npm test`, web at 390×844 on `/trails` and a trail page. Commit.
