# Ranking-first social: lists, placement posts, taste match, trail boards

Date: 2026-11-26 · Status: approved by owner (2026-11-26); launch waits until these ship

## Why

Feedback on Apex: "what makes this different from Strava?" Strava is for tracking yourself: pace, metrics, your own numbers. The owner wants Apex to feel like a **social platform for hikers**, with **ranking as the big focus**. Your ranked list of trails is your identity, and friends' lists are what you come to look at. Recording stays, because it's how a hike gets in, but it isn't the point.

Right now the difference is there but hidden. The feed card leads with distance, elevation and time. A friend's page is a log, newest first. The Social tab is all metric boards. Rankings show up only after a hike and in a small section on trail pages.

## Goals (all for the initial launch)

1. **Your list is your profile.** A person's page opens on their ranked trails.
2. **The post shows the placement.** "Maya ranked Half Dome **#2 of 14**, just above Angels Landing." If you've ranked it too: "You have it at #5."
3. **Taste match.** "You and Maya agree 82%" on friend pages. On trail pages: "Hikers with your taste loved this."
4. **Trail boards next to the climb boards.** Friends, groups and verified schools/companies each get a top-trails board ("Stanford's top hikes") beside their existing climb board.

## Non-goals

- **No features are cut.** The owner said so explicitly. The week card, climb leaderboards, streaks, weekly goal, weekend pick, flyover, own stats, follows, tags, gear and conditions all stay. Some move lower on the page.
- No change to how ranking works (buckets plus pairwise placement, 0–10 score).
- No public or stranger-visible rankings. Who can see what stays as it is today.
- No precomputed tables or background jobs.

## Anti-goals (a failure even if it works)

- Rankings get added to the screens but still read as secondary: stats stay louder than the placement, or the list sits below the hike log.
- Any feature lets someone see a ranking they couldn't see today, for example one person's private rating of a trail exposed through a "group average" of one.
- Taste numbers that look authoritative from almost no overlap ("100% match" from one shared trail).

## Constraints

- Expo SDK 57 / React Native, expo-router, TanStack Query, Supabase Postgres. The next migration is `028`.
- Rankings already live on the server: `trail_rankings` holds one row per (user, trail, hike_type) with `bucket` (`loved`/`fine`/`disliked`), a fractional `position`, `score` numeric(4,2) derived from bucket and position, `difficulty` and `updated_at`. Only the `hike` type exists. Because the score bands don't overlap, **`score desc` is a person's full list order**.
- Visibility today: `sees_posts(viewer, author)` covers yourself, friends and people you follow, minus blocks. `trail_people_rankings` already shows friends' and followed people's rankings of one trail under that same rule. New functions use the same rule and nothing looser.
- A post is a snapshot: `posts` keeps the bucket, score and bucket size from the moment it was posted ("Re-ranking later never rewrites what friends already saw", `lib/remoteSync.ts` `sendPost`). Hikes older than 7 days are ranked but never posted (`lib/postRules.ts`).
- Checks per `AGENTS.md`: typecheck, tests, and web at 390×844 for UI. One phone pass per plan.

## Approaches

- **A. A database function for each feature, like the friends board (chosen by owner).** Each returns only what the viewer may see, using `sees_posts` and the membership checks. Copies the pattern of `friend_board` (016), `trail_people_rankings` (024) and `group_board`/`organization_board`. The phone never downloads anyone's whole ranking table.
- B. The phone computes everything from fetched rankings. Faster to write, but it sends other people's full lists to your phone, and school boards with hundreds of members would be slow. Rejected.
- C. Precomputed tables kept current by triggers. Fastest reads, but more moving parts, and overkill at launch numbers. It's the upgrade path if boards get slow.

## Design

Build order: **1 → 2 → 4 → 3**. The post change is the most visible. Taste match goes last because it needs real overlap. Each step ships on its own.

### 1. Placement on the post

**Data.** Migration `028` adds to `posts`: `list_rank integer`, `list_size integer`, `below_trail_id uuid` (the trail just below it at posting time, null if it's last) and `above_trail_id uuid` (just above, null if it's #1). All are nullable, so old posts keep working. `sendPost` fills them from the local ranking store at the same moment it already reads bucket and score. Order is `score desc` within the `hike` type. These are snapshots like the score, and never rewritten.

`feed_posts` and `person_posts` return the four columns plus `below_trail_name` and `above_trail_name`, joined from `trails` when the viewer can read that trail (`can_read_trail`). Otherwise the name comes back null and the line is left out.

**Card.** `PostCard`'s headline becomes the placement:

```
(Maya)  Maya ranked Half Dome                  [9.4]
        #2 of 14 · just above Angels Landing
        Yosemite, CA · Sat
        You have it at #5
        ──────────────────────────────
        12.1 mi · 4,800 ft · 10h 2m        ← one quiet line
        [route / photos]
```

- When `list_rank` is null (older posts), it falls back to today's card.
- "just above X" comes from `below_trail_name`. If it's last, the line reads "just below X" using `above_trail_name`. If it's the first ranked trail: "First trail on Maya's list."
- "You have it at #N" uses the viewer's own list, worked out on the phone from `useMyRankedTrails`, and shows only if you've ranked that trail. This replaces `comparisonTag` where they overlap.
- The three big `Stat` blocks shrink to one muted line. The metric-based "reasons" lines stay, below the media.

### 2. The list is the profile

**Data.** New `person_rankings(person uuid)` returns `trail_id, trail_name, region, bucket, score, list_rank, difficulty, ranked_at` for the `hike` type, ordered `score desc`. The check is `sees_posts(auth.uid(), person)`, the same audience as `trail_people_rankings`. Limit 500. It includes trails that were never posted (the backlog). That's already visible today per trail through `trail_people_rankings`, so it's not a new exposure.

**Who sees it (owner decision):** the full list is visible to anyone who passes `sees_posts`, which includes followers. That covers the never-posted backlog too. The non-goal "no stranger-visible rankings" means people who don't follow you; following is the opt-in.

**Screen.** `app/friend/[id].tsx`: below the header, a segmented switch **List | Hikes**, defaulting to List.
- **Top ten is its own thing (owner decision).** The first ten sit in a separate "Top 10" card: big rank numerals, the cover image or route thumbnail per row, set apart from the rest. Below it, "The rest of the list" continues at #11 in plain compact rows. With fewer than ten trails, the card shows what there is and the rest section is left out.
- List rows show the rank number (large), trail name, region, score badge, and a small marker: "You: #5" if you ranked it, or "Not hiked yet" if you haven't. Tapping a row opens the trail page.
- Hikes is today's post list, unchanged.
- The same screen with `relation === 'self'` is your own profile. The existing `app/rankings.tsx` stays as your editing view.
- Empty: "{first} hasn't ranked a trail yet."

### 4. Trail boards

**Data.** New `friends_trail_board()`, `group_trail_board(g uuid)` and `organization_trail_board(o uuid)` each return `trail_id, trail_name, region, avg_score, rankers integer, place integer`. They are all-time, since rankings aren't weekly. The member checks are `is_group_member` / `is_org_member`, and for friends, `are_friends`. Scoring:
- **Friends board:** a trail needs at least 2 rankers, since friends already see each other's rankings.
- **Group and school/company boards (owner decision):** a trail needs at least **3 rankers besides the viewer**. The viewer's own ranking still counts in the average once that bar is met. This means no one can work out a single co-member's score.
- Order is average score, tie-broken by number of rankers.
- Top 20.
- Rows don't name people.

**Screens.** The existing climb board sections on the Social tab (`FriendsBoard`), `app/group/[id].tsx` and `app/org/[id].tsx` get a two-way switch **Trails | Climb**, defaulting to Trails. Climb is today's board with its week/month `PeriodSwitch`, untouched. On the Social tab, the friends section shows the trail board first. The week card stays where it is.

Empty state: "Top trails show up once two of you have ranked the same one."

### 3. Taste match

**Agreement number.** New `taste_match(person uuid)` returns `shared integer, agreement integer` (0–100), only when `sees_posts` holds. It's computed over trails both people ranked (`hike` type): of all pairs of shared trails, the share both people put in the same order by score. Ties are skipped. It shows only when **shared ≥ 4**; below that it returns the shared count and a null agreement.

On the friend page header: "You and Maya agree 82% · 9 trails in common". Below the threshold: "3 trails in common". If nothing's shared, nothing shows.

**"Hikers with your taste loved this."** New `taste_picks(max_rows int default 10)` returns trails the viewer hasn't ranked that are `loved` by people the viewer `sees_posts` for, whose agreement with the viewer is ≥ 70% with shared ≥ 4. Each row carries the trail, how many such people loved it, and up to two of their names ("Maya and 1 other with your taste loved this"). Names are fine because these people already see each other's rankings.

It shows in two places:
- a small line on a trail page when the trail is in the viewer's picks;
- a "For your taste" row on Home, placed after the feed's first few posts. If there are no picks, it doesn't show.

Agreement for these is computed inside the function. At launch numbers (dozens of friends), a straight query is fine. It's the first thing to move to approach C if it gets slow.

## Decided by the owner

- Ranking-first social over metrics. All three ideas (list, placement post, taste match), plus trail boards, for the initial launch. The launch waits for them.
- Followers see the full list. The top ten is a separate, special section.
- Group and school boards need 3 rankers besides you. The friends board needs 2.
- No feature gets cut. Metric features stay and may move lower.
- Approach A.

## My calls (owner can override)

- Placement is a snapshot on the post, like the score, so old posts never change their claim.
- A profile defaults to the List tab, and boards default to Trails.
- Taste numbers need at least 4 shared trails. "Your taste" means ≥ 70% agreement.
- Taste picks draw only from people you can already see (friends and follows), never strangers. That keeps it inside today's privacy rule, at the cost of being empty for people with few friends.
- Stats on the card shrink to one line rather than disappearing.
- **Private user-added trails** (019: readable only by the owner, the owner's friends, and people who logged or ranked the trail). Any function that returns a trail the viewer can't read (`can_read_trail` false) returns it as "A private trail", with no region, no id to tap, and the real rank kept, so numbering never skips. Trail boards and taste picks leave these trails out entirely.
- **Your own list:** the Home header gets your avatar next to search and the bell. Tapping it opens `/friend/[your id]`, which opens on your List tab. `app/rankings.tsx` links to it too ("See your profile"). No new tab.

## Left to the builder

- Exact migration SQL, indexes (likely `trail_rankings (trail_id)` and `(user_id, hike_type, score desc)`), and grants matching the 024 pattern (revoke from public/anon, grant to authenticated).
- Hooks (`usePersonRankings`, `useTasteMatch`, `useTrailBoard`, `useTastePicks`) on TanStack Query, invalidated when the viewer re-ranks.
- Exact copy, spacing, and the segmented-switch component (reuse `PeriodSwitch` styling).
- Tests: pure helpers for list rank and neighbors (`lib/`), and the agreement maths in a `lib/` function mirrored by SQL, with node tests.
- The web check at 390×844 for each screen; one phone pass at the end.
