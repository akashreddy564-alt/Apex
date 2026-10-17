# Apex iPhone launch roadmap

**Spec:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md`

The spec covers several independent subsystems, so it ships as separate plans. Each plan produces working, tested software on its own and lands as its own PR(s) based on main. Detailed plans are written when their turn comes, against the code as it is then.

| # | Plan | Depends on | Blocked by owner action | Status |
|---|------|-----------|--------------------------|--------|
| 0 | Launch foundation | none | Apple Developer, Expo account | **in progress:** units done (`feat/us-units`); Mapbox done; PRs #20–22, GRANTs, Apple, Expo open |
| 1 | Opening screen | none | none | **built, reviewed, tested** on `feat/opening-screen`; checked on web; not pushed, iPhone check owed |
| 2 | Trail catalog and freeform hikes | none | none | not started |
| 3 | Accounts, friends, feed, groups, leaderboards | 2 | Supabase GRANTs before Oct 30 | not started |
| 4 | Habit loops: streak, goal ring, weekend pick, home | 3 for friend-facing parts | none | not started |
| 5 | Route flyover and video share | none | none (Mapbox done) | **spike passed:** MP4 export works; see `.superpowers/spikes/flyover-notes.md` |
| 6 | Visual pass and App Store submission | all | Apple Developer | not started |

_Status updated 2026-10-17._

Plans 1, 2 and 5 can run in parallel; they touch separate files. Plan 3 is the critical path and the largest.

## 0. Launch foundation

- Owner: enroll in Apple Developer (can take days), create Expo and Mapbox accounts.
- Land #20, #21, #22 per the repo's merge rules, close #1 and #8, then `npx expo install --fix`. Recheck #22: it hides account UI when sync is off, but sync is now on at launch.
- Supabase GRANTs (due before Oct 30, 2026) and the migration for #17's hike fields.
- **Units.** Launch is US-only and the app shows km and m today. Add a units setting that defaults to miles and feet, and route every formatter in `lib/format.ts` through it. The spec doesn't mention this; I'm flagging it as a launch need.
- Real-device test: GPS recording with the screen locked.

## 2. Trail catalog and freeform hikes

- A recorded or past hike without a catalog match creates a user-owned trail (name typed by the user, geometry from the recording).
- Seed popular US trails from our own hosted extract (no public OSM tiles or Overpass; "© OpenStreetMap" shown).
- Matching: suggest a catalog trail when a recording's start is near a trailhead.

## 3. Accounts, friends, feed, groups, leaderboards

- Sign in with Apple plus email magic link. Recording and ranking work signed-out; local data uploads on first sign-in.
- Profiles with unique usernames; mutual friend requests; friends see all hikes.
- Every route shown to others hides its first and last 300 m (also used by plan 5's share export).
- Feed of friends' hikes with score and "ranked X above your Y" comparisons.
- Coworker groups joined by invite link or code; group and friend leaderboards of monthly elevation gain from recorded hikes only.
- Apple UGC rules: report and block users, act on reports. In-app account deletion.

## 4. Habit loops

- Weekly streak (Monday–Sunday, local time; at least one hike; past hikes count only inside the current week).
- Weekly goal ring (distance or elevation, user-chosen, with a default).
- Weekend pick from midweek, based on the user's rankings.
- Home screen that carries these at the opening screen's level.

## 5. Route flyover and video share

- First task is a spike: prove vertical video export of a Mapbox 3D camera flight plus a Skia line overlay. If it can't be done well, go back to the owner.
- 3D terrain flyover, glowing living line, camera choreography, count-up stats, skippable.
- With no signal, Finish goes straight to ranking; the flyover is available later from the hike page.
- Hands off to bucket ranking, then the score, streak and leaderboard payoff.

## 6. Visual pass and App Store submission

- Bring every remaining screen up to the opening screen's level.
- App Store listing, screenshots, privacy labels, UGC terms, TestFlight, review.
