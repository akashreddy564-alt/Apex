# Home dashboard and icons (2026-11-25)

## Why

The owner found Home plain next to apps like Strava, AllTrails and Beli. A new or signed-out user (and App Review) saw only a header and a sign-in card. The icons are thin stock outlines. It goes in the launch build (Thursday, Nov 26), so it reuses what already works and stays small enough to check on the phone tonight.

## Approaches

- **A. Focused "feels finished" pass (picked).** A fuller Home built from existing data, plus SF Symbols icons.
- B. Icons and empty states only. Lowest risk, but Home stays thin.
- C. Full dashboard redesign (charts, achievements). Too big for the night before submission.

The owner approved the returning-hiker mockup ("the second screenshot is great"): week card, Start a hike, Your top trails, Friends.

## Home, top to bottom

1. **Header.** `apex` wordmark; search (opens Trails with the search box focused) and the bell on the right. The "Trails" text link goes, since search covers it.
2. **Your week (hero card).** Eyebrow `THIS WEEK · <range>`. A big Anton number for feet climbed in climb brown, "N% of your 3,000 ft goal" under it, and the goal ring on the right. A divider, then three stats: Hikes, Miles (distance blue), Streak (weeks). At zero it still shows, with "Goal 3,000 ft". Tapping it opens the weekly goal screen.
3. **Start a hike.** The one dark card on the screen, with an arrow button. The subtitle is "Weekend pick: <trail>" when there's a pick (Wed–Sun), otherwise "Records your route, even locked". Tapping it goes to Log and starts the slider flow (same as Log's slide-to-start, through the pending-start store, never from a URL).
4. **Your top trails.** Your #1–#3 rankings (Anton rank number, name, score badge in the difficulty colours already used for scores), with "All N" opening Rankings. With no rankings: three dashed `#1 #2 #3` slots and "Rank your first hike and it lands here".
5. **Friends.** Signed in with friends' posts: the first post as today's post card, then "See all" (the full feed stays below, as now). Signed out, or no friends yet: **Trails near you**, a swipeable row of small route cards from `catalog_near` (needs location already allowed; otherwise the curated catalog), and a one-line sign-in strip when signed out.
6. The rest of the feed as today, for signed-in users.

The weekend pick card's content moves into the Start a hike subtitle; its "Not this one" stays on Log.

## Icons

A `SymbolIcon` component: SF Symbols (`expo-symbols`) on iOS, the current lucide icon on Android and web. The tab bar uses filled symbols when selected and outline when not (`house`/`house.fill`, `person.2`/`person.2.fill`, `figure.hiking`). The header uses `magnifyingglass` and `bell`/`bell.badge`. Other screens keep lucide for now.

## Not doing (anti-goals)

- No cinematic stock photos on Home (owner's rule: those are for the opening screen only).
- No new charts, achievements or server changes.
- Nothing that needs a native rebuild: `expo-symbols` is already in the dev client.

## Left to the builder

Exact spacing, card radii and type sizes within the existing tokens, and loading skeletons for each block. The order of signed-out blocks follows the mockup.

## Checks

Typecheck, tests, web at 390×844 (signed out and with seeded data), then on the phone.
