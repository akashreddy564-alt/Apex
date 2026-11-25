# Your own stats, friends' rankings on trails, and following (2026-11-25)

Three changes the owner asked for after the phone pass, all for the launch build.

## A. A trail's distance and climb come from your own hike

**Why.** Bulk catalog numbers are guesses. Cauley Creek Park shows 0.7 mi, but the walk people do there is the 5K loop. Wrong numbers on thousands of trails make everything built on them (difficulty, cards) untrustworthy.

**Decided (owner).**
- Every trail, the 23 curated ones included, shows **your** numbers: your most recent hike on it (distance, climb, time) and how many times you've hiked it.
- Before you've hiked it: **"Not hiked yet"** where distance and climb were. The difficulty card hides.
- Recorded hikes: GPS distance and GPS-altitude climb (already recorded). Past hikes: you type distance; a new optional **climb** field. Neither is pre-filled from the catalog, and a blank climb stays blank.
- The week card and weekly goal use only your hikes' own numbers (no catalog fallback).
- Feed posts show the hike's own distance and climb, never the trail's (server `feed_posts` stops falling back to catalog values).

**Builder's calls.** One helper `yourTrailStats(trailId, logs)` (pure, node-tested) used by every screen. The catalog keeps name, region, map line, search and Finish matching. Not tonight: barometer climb (needs a rebuild), friends' numbers on trails.

## B. Friends' rankings and difficulty on a trail

**Decided (owner).** After a hike you rate its **difficulty** on five steps: Easy, Moderate, Moderately strenuous, Strenuous, Very strenuous. A trail's page lists **friends and people you follow who ranked it**, each with score, bucket (Loved / Fine / Didn't like) and difficulty.

**Builder's calls.**
- `trail_rankings.difficulty smallint` (1–5, nullable), set in the ranking sheet ("How hard was it?" chips, optional, on the same step as the bucket) and synced like the rest of the ranking.
- Server function `trail_people_rankings(trail uuid)`: rows for people you're friends with or follow who ranked the trail, minus anyone blocked either way, best score first, at most 50. Rankings stay private otherwise (RLS unchanged).
- Trail page: a "Friends who ranked it" section; the difficulty badge shows your own rating if you gave one, otherwise the most common rating among those friends, otherwise nothing.

## C. Followers and following, on top of friends

**Decided (owner).** Anyone can follow anyone, Strava-style. Profiles show Followers and Following counts and lists, and the feed shows people you follow. Friends stay for the friends board, groups and friends' trails.

**Builder's calls.**
- `follows (follower_id, followee_id, created_at)`, primary key on the pair, no self-follow, rate-limited (60 an hour), refused when either person blocks the other. Blocking deletes follows both ways.
- One visibility rule: `public.sees_posts(viewer, author)` = same person, friends, or viewer follows author, and not blocked. Posts RLS, `can_see_post` (likes, comments), `feed_posts`, `person_posts` and hike photos use it. Following never opens the friends board, groups or user trails.
- Functions: `follow_person`, `unfollow_person`, `follow_counts(person)`, `follow_list(person, kind)` ('followers' or 'following'). Profiles are already readable by everyone signed in, so lists are public to signed-in users.
- A `follow` notification ("<name> followed you").
- App: Follow / Following button and counts on a person's page; counts on your own account screen; a followers/following list screen.

## Anti-goals

- Never show a catalog distance or climb as if it were measured.
- Following must not expose anything friends-only (boards, groups, private trails) or anything across a block.

## Checks

Typecheck and tests (new node tests for `yourTrailStats` and difficulty helpers; jest for the trail page sections and follow button); migrations applied and verified with queries as two seeded users; web at 390×844; then the phone.
