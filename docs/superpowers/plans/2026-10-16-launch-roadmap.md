# Apex iPhone launch roadmap

**Spec:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md`

The spec covers several independent subsystems, so it ships as separate plans. Each plan produces working, tested software on its own and lands as its own PR(s) based on main. Detailed plans are written when their turn comes, against the code as it is then.

| # | Plan | Depends on | Blocked by owner action | Status |
|---|------|-----------|--------------------------|--------|
| 0 | Launch foundation | none | Apple Developer (deferred to near launch) | **nearly done:** units (#24), Mapbox, Supabase with migrations and grants (007), Expo linked with cloud simulator builds, #20 and #21 merged, #1 and #8 closed. Open: rebuild #22 on main, `expo install --fix`. Past-hike fields now sync (on `feat/groups`). Real-device GPS test moves to the plan 3 phone pass |
| 1 | Opening screen | none | none | **done:** merged (#23). Launch-screen timing moves to the plan 3 phone pass |
| 2 | Trail catalog and freeform hikes | none | none | **done:** merged (#31); migration 008 and seed applied 2026-10-23. Finish → trail sheet moves to the plan 3 phone pass |
| 3 | Accounts, friends, feed, groups, leaderboards (now also the three-tab layout and new look) | 2 | none until friends test on their own phones (Apple Developer, domain, Resend) | **all six steps built; waiting on PRs, migrations and the phone pass.** 1 app shell (#32), 2 accounts (#33), 3 friends (#34) merged. 4 feed: code complete on `feat/feed` (feed, likes, comments, hike page, trimmed routes and friend photo access in `011`); owner runs `011` and the test-hiker seed. 5 groups and leaderboards: code complete on `feat/groups` (stacked on the feed): `012`, create and join by code or link, place and movement on Social, group page with together number, four stat cards, week/month/year board, invite, leave and remove; owner runs `012` and the seed again. 6 notifications, report and block: code complete on `feat/safety` (stacked on groups): `013`, in-app bell with friend requests, joins, likes, comments and "passed you"; report and block on profiles, posts and comments; blocked people in Settings; `open_reports.sql` for moderation |
| 4 | Habit loops: streak, goal ring, weekend pick, home | 3 for friend-facing parts | none | **started** on `feat/habit-loops` (stacked on the feed): weekly streak, notification ask, on-phone weekend reminders. Goal ring, weekend pick and Home layout not started |
| 5 | Route flyover and video share | none | none | **ready to build:** spike passed; owner approved Mapbox GL JS in a WebView (option A) |
| 6 | Visual pass and App Store submission | all | Apple Developer | **started:** cinematic look chosen; trail list, trail page hero and stats card merged (#25); first iPhone build check fixed collapsed cards and clipped names. Rest of screens, listing, TestFlight, review not started |

_Status updated 2026-11-04._

**Current spot:** plan 3. Step 4 (feed) and step 5 (groups) are built and waiting on PRs and on `011` and `012` being run. Step 6 (notifications, report and block) is built too. Next is plan 3's phone pass, after `011`–`013` run.

## How we check (from 2026-11-04)

Phone checks were slowing every step down and filling the disk, so they're batched.

- **Every change:** `npm run typecheck` and `npm test`. CI runs the same on each PR.
- **UI changes:** look at the changed screens on `npm run web` at 390×844. No phone.
- **Phone:** one pass at the end of each plan, not per step or PR. Plan 3's pass happens after step 6 and also clears everything owed below.
- **No rebuild for JS changes.** The installed dev client loads new code over Metro. Rebuild only when a native module or `app.json` plugin changes, and batch those into the phone pass (`expo-notifications` on `feat/habit-loops` needs one).
- **Build in the cloud, not on the Mac.** Use `eas build --profile simulator --platform ios` (or `build:dev` for the phone) instead of `npx expo run:ios`. The local `ios/` folder (about 4.5 GB, gitignored, generated) can be deleted between passes.

Owed for the plan 3 phone pass: GPS recording with the screen locked, launch-screen timing, Finish → trail sheet, magic link sign-in, friend invite link and QR, the feed with test hikers.

Plans 1, 2 and 5 can run in parallel; they touch separate files. Plan 3 is the critical path and the largest.

## 0. Launch foundation

- Owner: enroll in Apple Developer (can take days), create Expo and Mapbox accounts.
- Land #20, #21, #22 per the repo's merge rules, close #1 and #8, then `npx expo install --fix`. Recheck #22: it hides account UI when sync is off, but sync is now on at launch.
- Supabase GRANTs (due before Oct 30, 2026) and the migration for #17's hike fields.
- **Units: done** (#24). The app shows miles and feet; stored data stays metric.
- Real-device test: GPS recording with the screen locked (in the plan 3 phone pass).

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

- Spike **passed** (2026-10-16): frame-by-frame rendering to MP4 works with no missing tiles. It points to Mapbox GL JS in a WebView instead of `@rnmapbox/maps`; the owner approved this (option A) on 2026-10-17.
- 3D terrain flyover, glowing living line, camera choreography, count-up stats, skippable.
- With no signal, Finish goes straight to ranking; the flyover is available later from the hike page.
- Hands off to bucket ranking, then the score, streak and leaderboard payoff.

## 6. Visual pass and App Store submission

- Bring every remaining screen up to the opening screen's level.
- App Store listing, screenshots, privacy labels, UGC terms, TestFlight, review.
