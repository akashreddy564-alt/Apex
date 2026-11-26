# Home dashboard and icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home becomes a full dashboard (week hero, Start a hike, top trails, friends or nearby trails) that is never empty, with SF Symbols in the tab bar and header.

**Architecture:** Two pure functions in `lib/homeDashboard.ts` compute the week card and top-three list (node-tested). Four small components in `components/home/` render the blocks; `app/(tabs)/index.tsx` stacks them. `components/SymbolIcon.tsx` renders SF Symbols on iOS and falls back to lucide elsewhere.

**Tech Stack:** Expo 57, React Native, `expo-symbols` (already installed), lucide-react-native, Zustand stores, node `--experimental-strip-types` tests, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-25-home-dashboard-design.md`

## Global Constraints

- Launch build: no native rebuild, no server or migration changes.
- No cinematic stock photos on Home.
- Colours from `useColors()` only: feet climbed in `c.climb`, miles in `c.distance`; score badges use the existing score colours (`placementScoreLabel` / `ScoreBadge`).
- `lib/*.ts` used by node tests must not import `@/` paths.
- Recording never starts from a URL: Start a hike uses `usePendingStart.getState().request(FREEFORM)` then `router.navigate('/(tabs)/log')`.
- Copy (exact): eyebrow `THIS WEEK · <weekRange>`; `<N>% of your <goal> goal`; zero state `Goal <goal>`; `Start a hike`; subtitles `Weekend pick: <name>` / `Records your route, even locked`; `Your top trails`; `All <N>`; `Rank your first hike and it lands here`; `Trails near you`; `Sign in to see friends' hikes`.

## Review Focus

- A ranking whose trail isn't in the cache (catalog trail not fetched yet): the row still shows, with "Loading trail" as its name, and it fetches via `fetchCatalogTrails`. (Task 1 test.)
- Goal metric set to distance instead of elevation: the hero number and ring follow the metric (miles, `c.distance`). (Task 1 test.)
- Fewer than three rankings: show the ones that exist, then dashed slots for the rest. (Task 3 test.)
- Location never allowed: Trails near you shows the bundled catalog without prompting for permission. (Task 3 test.)
- Android and web: `SymbolIcon` renders the lucide fallback, never a blank. (Task 2 test.)

---

### Task 1: Week and top-trail data

**Files:**
- Create: `lib/homeDashboard.ts`, `lib/homeDashboard.test.ts`
- Modify: `package.json` (add the test file to the node test list)

**Interfaces:**
- Consumes: `weeklyProgress`, `WeeklyGoal`, `GoalLog`, `GoalTrail` from `lib/weeklyGoal.ts`; `weeklyStreak` from `lib/streak.ts`; `overallByScore` from `lib/ranking.ts`.
- Produces:
  - `weekCard(logs: GoalLog[], trailOf: (id) => GoalTrail | undefined, goal: WeeklyGoal, now?: Date): { metric: 'elevation' | 'distance'; done: number; target: number; percent: number; hikes: number; distanceKm: number; streakWeeks: number }`. `percent` is `0–100`, rounded, capped at 100. `distanceKm` sums this week's distance (log first, trail fallback) whatever the goal metric.
  - `topTrails<T extends { trail_id: string; score: number; position: string }>(rankings: T[], n?: number): T[]`, the best `n` (default 3) by `overallByScore`.

- [ ] **Step 1:** Write failing tests in `lib/homeDashboard.test.ts`:
  - `weekCard` with no logs → `{ done: 0, hikes: 0, distanceKm: 0, percent: 0, streakWeeks: 0 }`.
  - Three logs this week (600, 800, 740 m gain; 3.0, 3.5, 3.3 km) with a 914.4 m goal (3,000 ft) → `done` 2140, `hikes` 3, `distanceKm` ≈ 9.8, `percent` 100 (capped).
  - A log from last week is not counted.
  - A distance goal → `metric` `'distance'`, `done` = km.
  - `topTrails` on five rankings returns the three highest scores, best first, and on one ranking returns one row.
- [ ] **Step 2:** Run `node --experimental-strip-types --test lib/homeDashboard.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement both functions in `lib/homeDashboard.ts` on top of `weeklyProgress` and `weeklyStreak`.
- [ ] **Step 4:** Run it again. Expected: PASS. Add the file to `package.json`'s `test` script.
- [ ] **Step 5:** Commit `feat(home): week card and top-trail data`.

### Task 2: SF Symbols icons

**Files:**
- Create: `components/SymbolIcon.tsx`, `tests/symbol-icon.test.tsx`
- Modify: `components/TabIcon.tsx`, `app/(tabs)/_layout.tsx`

**Interfaces:**
- Produces: `SymbolIcon({ name, filledName?, fallback, size, color, focused? })`, where `name`/`filledName` are SF Symbol names and `fallback` is a `LucideIcon`. iOS renders `<SymbolView name={focused && filledName ? filledName : name} tintColor={color} />`; other platforms render the lucide `fallback` (stroke 2 when focused). `TabIcon` gains `symbol` and `filledSymbol` props and renders `SymbolIcon`.
- Tab symbols: Home `house` / `house.fill`; Social `person.2` / `person.2.fill`; Log `figure.hiking` (same name for both states, with bolder weight when focused).

- [ ] **Step 1:** Write a failing jest test: with `Platform.OS` mocked to `'android'`, `SymbolIcon` renders the lucide fallback; with `'ios'` it renders `SymbolView` with the filled name when `focused`.
- [ ] **Step 2:** Run `npx jest tests/symbol-icon.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement `SymbolIcon`; switch `TabIcon` and the three tabs in `_layout.tsx` to it (keep the lift and dot animation).
- [ ] **Step 4:** Run it again. Expected: PASS.
- [ ] **Step 5:** Commit `feat: SF Symbols in the tab bar`.

### Task 3: Home blocks and layout

**Files:**
- Create: `components/home/WeekHero.tsx`, `components/home/StartHikeCard.tsx`, `components/home/TopTrails.tsx`, `components/home/NearbyTrails.tsx`, `tests/home-dashboard.test.tsx`
- Modify: `app/(tabs)/index.tsx` (header icons, new order; remove the old `ThisWeek` row and the standalone `WeekendPick` from Home)

**Interfaces:**
- Consumes: `weekCard`, `topTrails` (Task 1); `SymbolIcon` (Task 2, header `magnifyingglass` and `bell`); `useWeeklyGoal`, `useWeekendPick`, `useRankingStore`, `useTrailCache`, `fetchCatalogTrails`, `catalogNear`, `knownPosition`, `CATALOG_TRAILS`, `usePendingStart`, `FREEFORM`.
- `NearbyTrails`: `knownPosition()` and, if present, `catalogNear(lon, lat, 25000)`, the first 8 by distance; otherwise the first 8 of `CATALOG_TRAILS`. It never asks for location.
- Header search opens `/trails?focus=search`; `app/trails.tsx` reads `focus` and autofocuses its box.

- [ ] **Step 1:** Write failing jest tests in `tests/home-dashboard.test.tsx`, rendering Home with mocked stores:
  - A new user, signed out → finds `THIS WEEK`, `Goal 3,000 ft`, `Start a hike`, `Rank your first hike and it lands here`, three `#1`/`#2`/`#3` slots, `Trails near you`, `Sign in to see friends' hikes`.
  - Two rankings → two ranked rows plus one dashed `#3` slot.
  - A ranking on an uncached trail → the row reads `Loading trail` and `fetchCatalogTrails` is called with that id.
  - No location permission → `catalogNear` is not called and bundled trails show.
  - Pressing Start a hike calls `usePendingStart.getState().request` with `FREEFORM` and navigates to Log.
  - Pressing the week card pushes `/goal`; pressing `All <N>` pushes `/rankings`.
- [ ] **Step 2:** Run `npx jest tests/home-dashboard.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Build the four components to the spec's order and copy, and restack `index.tsx`: header, `WeekHero`, `StartHikeCard`, `TopTrails`, then Friends (first feed post and "See all") when signed in with posts, else `NearbyTrails` plus the sign-in strip when signed out, then the rest of the feed.
- [ ] **Step 4:** Run it again. Expected: PASS. Then `npm run typecheck` and `npm test`, all green.
- [ ] **Step 5:** Web check at 390×844, signed out and with seeded logs and rankings: matches the approved mockup, nothing clipped, dark mode readable.
- [ ] **Step 6:** Commit `feat(home): dashboard with week hero, start, top trails and nearby trails`.

### Task 4: Phone check

- [ ] **Step 1:** Reload on the dev client. On iOS, check: the tab bar shows filled SF Symbols when selected; Start a hike lands on Log ready to record; search opens Trails with the keyboard up; the week ring matches Log's.
- [ ] **Step 2:** Fix anything found (typecheck, tests, web), then commit.
