# Apex launch design (iPhone v1)

Date: 2026-10-16. Status: draft for approval (builder check done).

## Intent

Apex combines Strava's activity tracking with Beli's ranking. Users record hikes, rank each one against their others, and compare with friends. The app should look so good that people ask "what app is that?" when they see it. It should also pull people back every week, the way Beli does.

The audience is young people with corporate jobs who hike on weekends. They open the app at their desk on a Tuesday, not just on the trail.

The owner's quality bar: it should feel genuinely compelling, use high-quality third-party UI pieces where they beat hand-rolled ones, and never feel "vibe coded."

## Goals

1. Ship to the iPhone App Store as soon as the quality bar allows. The owner's words: "iphone public asap". The earlier fallback date was Nov 15, 2026.
2. A first launch screen that stops people (see Opening screen).
3. A 3D route flyover after every recorded hike that people want to share.
4. Weekly habit loops: a streak, a goal ring, friends' activity, leaderboards, and a weekend pick.
5. Friends and leaderboards in the first public release. This is the owner's decision.

## Non-goals for v1

- Android. It comes after the iPhone launch. Google requires a 14-day closed test with 12 testers for new personal accounts, so the owner should start that early, but it does not block iPhone.
- Elo ranking. The bucket system stays.
- "Always" location permission. v1 is While Using only, unless the lock-screen test fails; that decision goes back to the owner.
- Web as a product surface. It can keep working for development.

## Anti-goals (failure even if it technically works)

- Anything that reads as templated AI output: purple-blue gradients, emoji as icons, default card stacks, centered-everything marketing layouts, generic stock "hiker at sunset" imagery.
- A streak that punishes people who only hike on weekends.
- Leaking where someone lives. Route starts and ends near home must not be exposed to other users.
- Photos used without a license, or "Did you know" facts that are wrong.
- Jank: the opening screen and flyover must hold 60 fps on a recent iPhone. A beautiful animation that stutters is worse than none.

## What exists today (main at `ee88193`)

Trail list and detail, a scrubbable elevation chart, GPS recording with pause, resume and finish, trail maps (canonical and recorded), photos on logs, past-hike entry, bucket ranking with binary insert, a ranked list with a reveal, and optional Supabase magic-link sign-in and sync. Stack: Expo SDK 57, expo-router, NativeWind, Reanimated, Skia, Zustand, TanStack Query, Supabase.

Open PRs: #20 (reveal row), #21 (tab hit targets), #22 (cleanup, also hides account UI when sync is off). #1 and #8 are superseded.

## Where people can hike (decided)

- Launch in the US App Store only. Elevation comes from USGS, which covers the US.
- People can record any hike anywhere and name it themselves. A recorded hike without a matching trail creates the user's own trail entry.
- Seed a catalog of popular US trails so friends' hikes on the same trail match up for the feed comparisons, rankings and weekend pick. The builder picks the source, within the OSM and Overpass constraints below. Use our own hosted extract, never public servers.

## Features

### 1. Opening screen (decided)

Shown on every cold launch, before the main tabs.

- A full-bleed photo of one of the hardest trails, climbs, or treks in the world. It drifts slowly (a gentle Ken Burns zoom and pan).
- Top center: the APEX wordmark, small, widely letter-spaced.
- Lower third, centered: the place name in very large condensed poster type, uppercase, over two lines if needed.
- Under it, a centered stats row: location on the left, elevation in the middle between thin vertical rules (accent color), grade or type on the right.
- At the bottom: a "Did you know" fact with no box or background. Just a small divider line, a small label, and one or two lines of text with a soft text shadow so it reads over the photo. The photo stays the hero.
- A different place and fact on each launch, from a curated, bundled set.
- Reference mockup: `.superpowers/brainstorm/*/content/opening-screen-v2.html`, option A2.

Content needs: about 20–30 places at launch. Each needs a properly licensed photo (Unsplash license, or CC from Wikimedia with credit shown somewhere reachable), the name, elevation, location, grade or type, and one verified fact with a source kept in the data file.

### 2. Route flyover (decided)

Plays when the user taps Finish on a recorded hike.

- The screen goes dark, then real 3D terrain fades in, with the camera high above the trailhead.
- The route line draws itself along the actual GPS path. It should feel "alive and advanced" (owner's words): a bright glowing head, a tail that fades behind it, brighter on steep sections, small markers for photos and the summit.
- Distance, elevation gain, and time count up alongside it.
- The camera follows the line through the turns, slows and circles at the high point, then pulls back to show the whole route.
- It ends by handing off to the existing bucket ranking step. After placing the hike, the new score animates in, along with any streak or leaderboard change ("You passed Maya this month").
- Share: export a vertical video clip for Instagram stories, ending on the stats and the APEX wordmark.
- It must be skippable, and it must work on short and long routes.

### 3. Weekly streak

A streak counts consecutive weeks with at least one logged hike (recorded or past). The week runs Monday to Sunday in the user's local time. It shows on the home screen and in the post-hike payoff. A missed week resets it.

### 4. Weekly goal ring

A ring that fills toward a weekly target of distance or elevation gain, chosen by the user, with a sensible default. It sits next to the streak.

### 5. Friends and activity feed

- Accounts become required for the social features. Supabase sync and sign-in are no longer off at launch. This replaces the earlier "first store build ships with sync off" decision.
- Users can find and add friends.
- The feed shows friends' hikes: the trail, key stats, the route thumbnail, photos, and their Beli-style score and placement. Where it applies, it compares to your own ranking ("ranked Mission Peak above your Half Dome").

### 6. Leaderboards

Friends ranked by this month's elevation gain, plus whatever other boards the builder judges worth it. Coworker groups were mentioned as appealing.

### 7. Weekend pick

One trail suggestion each week, based on how the user ranks hikes. It shows on the home screen from midweek.

## Constraints

- Read the Expo SDK 57 docs before writing code (`AGENTS.md`).
- No OpenStreetMap tile servers and no public Overpass. Show "© OpenStreetMap" wherever OSM data appears. Elevation comes from USGS via Open Topo Data.
- Ranking rules stay: Loved, Fine, or Didn't like buckets with binary insert, and a 0–10 score shown only once a bucket has 3 or more hikes.
- Apple requirements: in-app account deletion for any app with accounts. For user-generated content (photos, feed), the ability to report and block users, and a way to act on reports.
- Supabase GRANTs are due before Oct 30, 2026. #17's new hike fields need a migration to sync.
- Land #20, #21, and #22 before the first TestFlight build, then run `npx expo install --fix`. Note: #22 hides account UI when sync is off. Sync is now on at launch, so check that #22 still makes sense.
- Local-only iPhone build config (bundle id `com.akashreddy.apex.dev`, Personal Team signing) must never be committed.
- The real-device GPS test with the screen locked is still owed.
- Accounts: the owner has Supabase. The owner does not yet have Apple Developer ($99/yr, enrollment can take days, and it blocks TestFlight) or Mapbox (it blocks the flyover prototype). The owner needs to create both. An Expo account is needed for EAS builds. Google Play ($25) comes later for Android.

## Scope at launch (decided)

Everything in Features ships in v1: the opening screen, flyover with video share, streak, goal ring, friends and feed, leaderboards with coworker groups, and the weekend pick. The owner's view is that the goal ring, weekend pick, coworker groups and video can all be done with modest effort. Coworker groups: a group that people join by invite link or code, with its own leaderboard.

## How it gets made

Owner's decisions:
- Expo / React Native app (existing).
- iPhone first.

My calls (owner can push back):
- Mapbox (`@rnmapbox/maps`) for 3D terrain and camera animation in the flyover. It needs a Mapbox account and token, is free up to a usage limit, and costs more at scale.
- Skia (already installed) for the glowing route line and other custom motion.
- Supabase (already wired) for accounts, friends, feed, and leaderboards.
- Video export of the flyover is the riskiest technical piece, so prototype it first. The owner expects it in v1. If the prototype shows it can't be done well, bring that back to the owner rather than cutting it quietly.
- Keep the current repo conventions: PRs based on main, merge commits not squash, nits batched into a cleanup PR.
- Sign-in: the app works without an account for recording and ranking, as it does today. Social features ask you to sign in. Local hikes and rankings upload when you first sign in. Offer Sign in with Apple plus the existing email magic link.
- Friendships are mutual: one person sends a request and the other accepts. Friends see all of your hikes; nobody else does. There's no per-hike privacy in v1.
- Home protection: every route shown to anyone but the owner has its first and last 300 m hidden, automatically. The same trimmed route is used in the shared video and image card.
- Leaderboards count recorded hikes only. Manually logged past hikes count toward the streak only if they fall in the current week, so backdating can't repair a broken streak.
- Flyover with no signal: the ranking step never waits on it. If the terrain can't load, Finish goes straight to ranking, and the flyover becomes available from the hike's page once the phone is back online.
- Opening-screen content: the builder drafts the places, photos, credits and facts with sources. The owner reviews them before release.

## Left to the builder

- Exact visual system for the rest of the app (it must match the opening screen's level, and the current Zinc and Sage tokens can change).
- Which third-party UI libraries to use, held to the quality bar above.
- Data model and RLS policies for friends, feed, and leaderboards.
- Weekend pick logic.
- Animation details for the streak, ring, and payoff moments.
