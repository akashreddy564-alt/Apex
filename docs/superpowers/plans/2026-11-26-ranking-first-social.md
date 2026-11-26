# Ranking-first social Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Placement posts, list-as-profile with a separate top ten, trail boards beside climb boards, and taste match.

**Architecture:** One migration (`028`) adds placement columns to `posts` and security-definer SQL functions gated by `sees_posts` and the membership checks. Pure helpers in `lib/` (node-tested) hold the ordering, placement and agreement maths; `lib/rankLists.ts` holds the RPC calls; `hooks/useRankLists.ts` wraps them in TanStack Query. Screens reuse `PeriodSwitch` styling for the new switches.

**Tech Stack:** Expo SDK 57, expo-router, TanStack Query, Supabase Postgres 17.

**Spec:** `docs/superpowers/specs/2026-11-26-ranking-first-social-design.md`

## Global Constraints

- List order everywhere = `score desc, position (byte order), trail_id`, `hike_type = 'hike'` (matches `overallByScore` in `lib/ranking.ts`).
- Visibility: `sees_posts(auth.uid(), person)` for lists, taste and picks. `are_friends` for the friends board. `is_group_member` / `is_org_member` for the group and org boards.
- Friends trail board: ≥ 2 rankers. Group and org trail boards: ≥ 3 rankers **besides the viewer**. Top 20. No names.
- Taste agreement shows only with ≥ 4 shared trails. "Your taste" means agreement ≥ 70.
- A trail the viewer can't read (`can_read_trail` false) shows as "A private trail" on lists, with no region and no tap. It's left out of boards and picks.
- Old posts with null placement render exactly as before.
- Grants: revoke from public and anon, grant execute to authenticated (024 pattern).
- Checks: `npm run typecheck`, `npm test`, web at 390×844.

## Review Focus

- A post whose neighbour trail is private or deleted: the line drops the neighbour and keeps "#2 of 14".
- A list with exactly 10 or fewer trails: no "rest of the list" section, and no empty card.
- Taste with 4 shared trails all tied in score: agreement is null, not NaN or 100.
- Being one of exactly 3 rankers on a group board, you included: the trail must not show, since it needs 3 besides you.
- A blocked person: missing from lists, taste and picks even if a follow row exists (`sees_posts` covers this; test via SQL by reading the function).

---

### Task 1: Pure helpers — placement and taste

**Files:** Create `lib/listPlace.ts`, `lib/listPlace.test.ts`, `lib/taste.ts`, `lib/taste.test.ts`. Add both tests to `package.json` `test`.

**Produces:**
- `listPlacement(rows: {trail_id; score; position}[], trailId: string): { rank: number; size: number; aboveTrailId: string | null; belowTrailId: string | null } | null`
- `placementLine(p: { listRank: number | null; listSize: number | null; aboveTrailName: string | null; belowTrailName: string | null; firstName: string; isMine: boolean }): string | null`. Possible outputs: "#2 of 14 · just above Angels Landing", "#14 of 14 · just below X", "First trail on Maya's list" (or "your list" when it's yours), "#2 of 14", or null when rank is null.
- `myRankOf(mine: {trailId; score; position?}[], trailId): number | null`
- `agreement(a: Map<string, number>, b: Map<string, number>): { shared: number; agreement: number | null }`. This is the share of concordant pairs among non-tied pairs on both sides, ×100, rounded. Null below `MIN_SHARED = 4` or when there are no untied pairs.
- `TASTE_THRESHOLD = 70`

- [ ] Tests: the rank of the middle, first and last trails, plus size; neighbour ids; each `placementLine` branch; `agreement` gives 100 for the same order, 0 for reversed, null for 3 shared, null when everything is tied, and 83 for 4 shared with one swap (5 of 6 pairs).
- [ ] Implement, run `node --experimental-strip-types --test lib/listPlace.test.ts lib/taste.test.ts`, and expect PASS.
- [ ] Commit.

### Task 2: Migration 028

**Files:** Create `supabase/migrations/028_ranking_social.sql`. Modify `supabase/checks/migration_status.sql` (add rows 33 for 027 if missing, and 34 for 028).

**Produces (SQL):**
- `posts`: `list_rank int`, `list_size int`, `above_trail_id uuid`, `below_trail_id uuid`, all nullable, with FKs to trails `on delete set null`.
- `feed_posts`, `person_posts`: drop and recreate with the 026 columns plus `list_rank, list_size, above_trail_name, below_trail_name`. A name is null unless `can_read_trail`.
- `person_rankings(person uuid)` → `trail_id uuid, trail_name text, region text, bucket text, score numeric, list_rank int, difficulty smallint, ranked_at timestamptz, readable boolean`. When the trail isn't readable, `trail_id`, `trail_name` and `region` come back null.
- `friends_trail_board()`, `group_trail_board(g uuid)`, `organization_trail_board(o uuid)` → `trail_id, trail_name, region, avg_score numeric, rankers int, place int`.
- `taste_match(person uuid)` → `shared int, agreement int`.
- `taste_picks(max_rows int default 10)` → `trail_id, trail_name, region, lovers int, names text[]`.
- Indexes: `trail_rankings (trail_id, hike_type)` and `trail_rankings (user_id, hike_type, score desc)`.

- [ ] Write it. Agreement in SQL: a self-join of shared pairs with `sign(a1-a2) * sign(b1-b2)`.
- [ ] Apply it to the Apex project (it's additive) and run the status check. Expect every row true.
- [ ] Commit.

### Task 3: Placement on the post

**Files:** Modify `lib/postRules.ts` (`FeedPost` gets `listRank, listSize, aboveTrailName, belowTrailName`, read in `mapFeedPost`), `lib/postRules.test.ts`, `lib/remoteSync.ts` `sendPost` (fills the 4 columns via `listPlacement`), and `components/feed/PostCard.tsx`.

- [ ] Test: `mapFeedPost` reads the four fields, and they're null when missing.
- [ ] Card: the placement line under the headline. "You have it at #N" via `myRankOf` when it's not your post; it replaces `comparisonTag` when shown. Stats collapse to one muted line: `12.1 mi · 4,800 ft · 10h 2m`.
- [ ] Typecheck and tests, then commit.

### Task 4: List as profile

**Files:** Create `lib/rankLists.ts` (fetchers plus pure mappers `mapRankedRow`, `mapBoardTrail`, `mapTastePick`), `lib/rankLists.test.ts` (mappers only, without importing supabase: put the mappers in `lib/rankListRules.ts`), `hooks/useRankLists.ts` (`usePersonRankings(id, enabled)`, `useTasteMatch(id, enabled)`, `useTrailBoard(kind: 'friends'|'group'|'org', id?)`, `useTastePicks()`), and `components/profile/RankedList.tsx` (`TopTen` card plus `RestOfList`). Modify `app/friend/[id].tsx` (a List | Hikes switch, defaulting to List), `app/(tabs)/index.tsx` (header avatar → `/friend/[my id]`), and `app/rankings.tsx` ("See your profile" link).

- [ ] Mapper tests: a private row maps to `readable: false` with the name "A private trail".
- [ ] Build the screens. The top-ten card has big numerals and the trail cover or route figure. The rest are compact rows from #11. Markers: "You: #5" or "Not hiked yet".
- [ ] Typecheck, tests, web at 390×844, then commit.

### Task 5: Trail boards

**Files:** Create `components/groups/TrailBoard.tsx` and `BoardKindSwitch` (Trails | Climb) in `components/groups/Leaderboard.tsx`. Modify `components/social/FriendsBoard.tsx`, `app/group/[id].tsx` and `app/org/[id].tsx`. Each defaults to Trails, and the climb view is unchanged. Empty copy for friends: "Top trails show up once two of you have ranked the same one." For groups and orgs: "Top trails show up once three other members have ranked the same one."

- [ ] Build, typecheck, check on the web, commit.

### Task 6: Taste match

**Files:** Create `components/profile/TasteLine.tsx` and `components/home/TastePicks.tsx`. Modify `app/friend/[id].tsx` (the header line), `app/(tabs)/index.tsx` (the picks row after the 3rd post, hidden when empty) and `app/trail/[id].tsx` (the "with your taste loved this" line when the trail is in your picks).

- [ ] Copy: "You and Maya agree 82% · 9 trails in common" / "3 trails in common" / nothing. Picks: "Maya and 1 other with your taste loved this".
- [ ] Build, typecheck, test, check on the web, commit.

### Task 7: Whole-branch check

- [ ] `npm run typecheck`, then `npm test`. Expect zero errors and every test passing.
- [ ] Web at 390×844: a friend page with the list, the feed card, and the Social, group and org boards.
- [ ] A final review of the whole branch by a fresh reviewer. Fix the findings.
