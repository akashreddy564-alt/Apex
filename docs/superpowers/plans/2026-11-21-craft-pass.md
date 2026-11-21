# Craft Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Apex's frontend to Ripe's level of craft: three signature screens (Trail detail, Log, Weekly goal) plus a shared craft kit that every other screen picks up.

**Architecture:** All math and copy decisions live in pure `lib/*.ts` modules with node tests (no `@/` imports, relative `.ts` imports, as the existing `lib/` files do). Visual pieces live in `components/motion/` (the kit) and `components/craft/` (screen-level objects). Everything draws with Reanimated and react-native-svg, so web and native share one code path. Skia is not used.

**Tech Stack:** Expo SDK 57, React Native, Reanimated plus react-native-worklets, react-native-gesture-handler, react-native-svg, NativeWind, expo-haptics, expo-blur (new), Jest via jest-expo, and `node --test` for `lib/`.

**Spec:** `docs/superpowers/specs/2026-11-21-craft-pass-design.md`. The visual reference is `.superpowers/brainstorm/8695-1795245136/content/craft-screens.html`. Open it in a browser next to your work.

**Branch:** `feat/craft-pass`, cut from `feat/hardening` (main lacks the motion kit, goal and social work this builds on).

## Global Constraints

- Read https://docs.expo.dev/versions/v57.0.0/ for any Expo API before using it (AGENTS.md).
- Colors only from `useColors()` or Tailwind tokens. Fonts only from `fonts` in `theme/tokens.ts`. Both appearances must look right.
- Every looping or entering animation checks `useReducedMotion()`. When it's on, show the end state with no loop.
- Only three things may loop: loaders, skeleton shimmer, and the slider's label sheen. Update the header comment in `components/motion/index.tsx` to say so.
- Every gesture has an accessible alternative: adjustable for the scrubber and dial, and a plain button action for the slider.
- A reason line appears only when its data supports it. The `lib/` functions return `null` rather than a weaker claim.
- Copy: plain, specific, no exclamation marks. Units: mi and ft for display, metric in storage (`lib/format.ts`).
- Eyebrow style: `fonts.mono` (SpaceMono), 10 px, uppercase, letterSpacing 1.6, `fgMuted`.
- Display style: `fonts.displayExtraBold`, uppercase, lineHeight 0.88 × fontSize, letterSpacing −0.025 × fontSize.
- Card style: `surface` fill, 1 px `raised` border, radius 22, padding 16.
- Ported code comes only from MIT, Apache-2.0 or BSD sources, and the file header names the source and license.
- New node test files must be appended to the `test` script in `package.json`, or they won't run.
- Checks:
  - After each task: `npm run typecheck` and `npm test`.
  - UI tasks: also check web at 390×844 (`npm run web`).
  - Phone: one pass, in Task 12 only.

## Review Focus

1. **Trails with no usable profile or path** (user trails, `trail-unmapped`, a profile with fewer than 2 samples, a path with fewer than 2 points). Scrubber, route tracer and difficulty reasons hide; the screen still renders. Tests: Task 1 and Task 2.
2. **No hikes, or a hike whose trail is missing from the cache.** Log shows the empty register. Reason functions return `null`, not "NaN ft". Tests: Task 2 and Task 9.
3. **Goal metric set to distance.** The odometer, dial, bars and pace line all switch to miles with the distance ranges. Tests: Task 4.
4. **Hikes near week edges and in the future.** A Sunday 23:30 hike counts in that week; future-dated logs are ignored, matching `weeklyStreak`. Tests: Task 3 and Task 4.
5. **Slider released partway, or a hike already recording.** A partial slide springs back without starting. While tracking, the slider isn't shown and `/log?start=` doesn't start a second hike. Tests: Task 6 and Task 8.

---

### Task 1: Profile scrub math

**Files:**
- Create: `lib/scrub.ts`
- Test: `lib/scrub.test.ts` (add to the `test` script)

**Interfaces:**
- Produces:
  - `interface ScrubPoint { distanceM: number; elevationM: number; climbedM: number }`
  - `scrubAt(profile: { distance_m: number; elevation_m: number }[], fraction: number): ScrubPoint | null`
  - `routeFraction(shape: 'loop' | 'out-and-back' | 'point-to-point' | null | undefined, fraction: number): number`
  - `ticksCrossed(fromM: number, toM: number, stepFt?: number): number`
  - `canScrub(profile: { distance_m: number }[]): boolean`

- [ ] **Step 1: Write failing tests.**
  - `canScrub([])` and a 1-sample profile return `false`. Two samples return `true`.
  - `scrubAt` on `[{0,1000},{100,1100},{200,1050}]`:
    - at 0.25: `{ distanceM: 50, elevationM: 1050, climbedM: 50 }`
    - at 1: `climbedM` 100 (descents don't count)
    - clamps −1 to 0 and 2 to 1
    - returns `null` when `canScrub` is false
  - `routeFraction('out-and-back', 0.25)` is 0.5, `0.75` is 0.5 and `1` is 0. `routeFraction('loop', 0.3)` is 0.3, and `null` behaves like loop.
  - `ticksCrossed(0, 400)` is 2 (500 ft is 152.4 m, so 304.8 m is the second tick). `ticksCrossed(400, 0)` is 2. `ticksCrossed(10, 20)` is 0.
- [ ] **Step 2: Run `node --experimental-strip-types --test lib/scrub.test.ts`.** Expect it to fail because the module is missing.
- [ ] **Step 3: Implement `lib/scrub.ts`.** Interpolate linearly between the bracketing samples. `climbedM` sums positive steps up to the point, including the partial step.
- [ ] **Step 4: Run the test.** Expect it to pass.
- [ ] **Step 5: Commit** `feat(lib): profile scrub math`.

### Task 2: Reason lines

**Files:**
- Create: `lib/reasons.ts`
- Test: `lib/reasons.test.ts` (add to the `test` script)

**Interfaces:**
- Consumes: `climbRateFtPerMile` and `difficultyRating` from `lib/trailDifficulty.ts`.
- Produces:
  - `interface Reason { value: string; text: string }`
  - `difficultyReasons(t: { distance_km: number | null; elevation_gain_m: number | null; peak_elevation_m: number | null; elevation_profile: { distance_m: number; elevation_m: number }[] }): Reason[]`
  - `hikeReasons(hike: { id: string; distance_km: number | null; elevation_gain_m: number | null; duration_seconds: number }, others: { id: string; distance_km: number | null; elevation_gain_m: number | null; duration_seconds: number }[]): { distance: string | null; climb: string | null; time: string | null }`
  - `rankReason(above: string | null, below: string | null): string | null`

- [ ] **Step 1: Write failing tests.** `difficultyReasons` returns up to three lines, in this order:
  1. **Climb:** value `"1,942 ft"`. Text `"of climbing, nearly all of it in the first 2.8 mi"`, but only when 80% of the climb happens within the first 55% of the distance. Otherwise the text is just `"of climbing"`.
  2. **Rate:** value `"349"`, text `"feet of climb per mile on average"`.
  3. **Summit:** value `"5,791 ft"`, text `"at the summit, about 1,510 ft above the trailhead"`, using the first profile sample as the trailhead.
  - Lines whose inputs are null are omitted, so all-null input returns `[]`.
  - Use a fixture shaped like Angels Landing: rising to 2.8 mi, then falling.
- [ ] **Step 2: Write failing tests for `hikeReasons`.**
  - **Distance:** `distance` is `"Your longest hike yet"` only when the hike beats every other hike and there are at least 2 others with a distance. Otherwise `null`.
  - **Climb:** `climb` is `"Your biggest climb yet"` under the same rule, using elevation gain.
  - **Time:** `time` compares minutes per mile with the average of other hikes that have both distance and duration (at least 2 needed). It returns `"22 min faster than your usual pace"` or `"… slower than …"`, where minutes = (average pace − this pace) × this distance, rounded. It returns `null` under 2 comparable hikes or when the difference is under 3 min.
  - **Rank:** `rankReason('Mission Peak', 'Half Dome')` is `"Above Mission Peak, below Half Dome"`. One side null gives `"Above Mission Peak"` or `"Below Half Dome"`. Both null gives `null`.
- [ ] **Step 3: Run `node --experimental-strip-types --test lib/reasons.test.ts`.** Expect it to fail.
- [ ] **Step 4: Implement.** Feet use `Math.round(m * 3.28084)` with comma grouping. Miles use one decimal.
- [ ] **Step 5: Run the test.** Expect it to pass.
- [ ] **Step 6: Commit** `feat(lib): reason lines for trails and hikes`.

### Task 3: Streak grid

**Files:**
- Create: `lib/streakGrid.ts`
- Test: `lib/streakGrid.test.ts` (add to the `test` script)

**Interfaces:**
- Consumes: `weekStart` from `lib/streak.ts`; `GoalLog` and `GoalTrail` from `lib/weeklyGoal.ts`.
- Produces:
  - `type DayLevel = 0 | 1 | 2`
  - `streakGrid(logs: readonly GoalLog[], trailOf: (id: string) => GoalTrail | undefined, now?: Date, weeks?: number): DayLevel[][]`. The result is indexed `[weekIndex][dayIndex]`: weeks from oldest to newest, days Monday to Sunday. `weeks` defaults to 12.
  - `FULL_HIKE = { gainM: 305, distanceKm: 8.05 }`

- [ ] **Step 1: Write failing tests.**
  - The grid is 12 × 7.
  - A hike with a climb of at least 305 m, or a distance of at least 8.05 km, is level 2. Any other hike is level 1. A day without a hike is 0. The log's own value wins over the trail's, like `weeklyProgress`.
  - Two hikes on the same day keep the higher level.
  - A Sunday 23:30 local hike lands in that week's column 6.
  - Future-dated, unparseable and older-than-12-weeks logs are ignored.
- [ ] **Step 2: Run the test.** Expect it to fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the test.** Expect it to pass.
- [ ] **Step 5: Commit** `feat(lib): 12-week streak grid`.

### Task 4: Goal dial and week bars math

**Files:**
- Create: `lib/goalDial.ts`
- Test: `lib/goalDial.test.ts` (add to the `test` script)

**Interfaces:**
- Consumes: `GoalMetric`, `GoalLog`, `GoalTrail`, `toStored` and `toDisplay` from `lib/weeklyGoal.ts`; `weekStart` from `lib/streak.ts`.
- Produces:
  - `DIAL_RANGE: Record<GoalMetric, { min: number; max: number; step: number }>`, in display units: elevation `{ 1000, 8000, 250 }`, distance `{ 5, 30, 1 }`.
  - `DIAL_SWEEP_DEG = 260`
  - `DIAL_START_DEG = -220`
  - `angleToDisplay(metric: GoalMetric, angleDeg: number): number`. The angle is measured like `Math.atan2` in degrees. The result snaps to `step` and clamps to the range. Angles past the end of the sweep go to whichever end is nearer.
  - `displayToFraction(metric: GoalMetric, display: number): number`
  - `dailyTotals(logs: readonly GoalLog[], trailOf: (id: string) => GoalTrail | undefined, metric: GoalMetric, now?: Date): number[]`. Seven stored-unit totals, Monday to Sunday of this week.
  - `paceLine(metric: GoalMetric, doneStored: number, targetStored: number, now?: Date): { tone: 'good' | 'behind' | 'done'; text: string }`

- [ ] **Step 1: Write failing tests.**
  - **Angles:**
    - `angleToDisplay('elevation', -220)` is 1000, and `40` is 8000.
    - The midpoint, −90, is 4500.
    - `angleToDisplay('elevation', -200)` snaps to the nearest 250.
    - For distance, −220 is 5 and 40 is 30.
  - **Fractions:** `displayToFraction('elevation', 4500)` is 0.5.
  - **Daily totals:** a Saturday hike of 1,100 ft and a Sunday hike of 842 ft put stored metres in slots 5 and 6. Future logs are ignored.
  - **Pace line:**
    - done ≥ target gives `{ tone: 'done', text: 'Goal met. Anything more is a bonus.' }`
    - remaining ≤ 40% of the target gives `tone: 'good'` and text `"1,058 ft to go. One more good hike gets you there."`
    - otherwise `tone: 'behind'` and text `"2,600 ft to go, with 3 days left this week."` Days left includes today, counting to Sunday.
    - distance uses `"mi"` throughout.
- [ ] **Step 2: Run the test.** Expect it to fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the test.** Expect it to pass.
- [ ] **Step 5: Commit** `feat(lib): goal dial and week bar math`.

### Task 5: Craft kit, visual pieces

**Files:**
- Create: `lib/contours.ts` and `lib/contours.test.ts` (add to the `test` script)
- Create: `components/motion/haptics.ts`, `Odometer.tsx`, `DrawIn.tsx`, `ContourTexture.tsx`, `ContourLoader.tsx`, `Skeleton.tsx`, `ReasonLine.tsx`, `Eyebrow.tsx`
- Modify: `components/motion/index.tsx`. Re-export all of these, and replace the header's "Nothing loops" paragraph with the rule from Global Constraints.
- Test: `tests/craft-kit.test.tsx`

**Interfaces:**
- Produces:
  - `contourPaths(seed: string, width: number, height: number, rings?: number): string[]` (in `lib/contours.ts`). It's deterministic for a given seed. `rings` defaults to 12, and every path is closed (it ends in `Z`).
  - `haptics.tapLight(): void`, `haptics.select(): void` and `haptics.success(): void`. These do nothing when `Platform.OS === 'web'`.
  - `<Odometer value: number; format: (n: number) => string; size?: number />`. Digits roll on a spring from their previous value. Commas and other non-digits render static. `accessibilityLabel` is `format(value)`.
  - `<DrawIn d: string; stroke: string; strokeWidth?: number; duration?: number; delay?: number; length: number />`. It renders an SVG `Path` that animates `strokeDashoffset` from `length` to 0 once.
  - `<ContourTexture seed: string; width: number; height: number; opacity?: number />`. Stroke color is `accent` at 10% alpha. It is not accessible (`accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`).
  - `<ContourLoader size: 'sm' | 'md' | 'screen'; color?: string; label?: string />`. It shows three rings that spread and fade on a 2 s loop, with `accessibilityRole="progressbar"` and an `accessibilityLabel` of `label ?? 'Loading'`. The screen size centers itself and shows the `label` text under the rings.
  - `<Skeleton shape: 'row' | 'card' | 'post'; count?: number />`, a shimmering placeholder hidden from accessibility.
  - `<ReasonLine value: string; text: string />`
  - `<Eyebrow>{string}</Eyebrow>`

- [ ] **Step 1: Write failing node tests for `contourPaths`.** Same seed gives an equal array. A different seed gives a different array. Length equals `rings`. Each path starts with `M` and ends with `Z`.
- [ ] **Step 2: Write failing Jest tests in `tests/craft-kit.test.tsx`.** Mock AsyncStorage as `tests/score-badge.test.tsx` does.
  - `Odometer` with `value={1942}` and a comma format has accessibility label `"1,942"`.
  - `ContourLoader` has role `progressbar` and label `"Loading"`, or the `label` prop when given.
  - With `useReducedMotion` mocked to `true`, `DrawIn` renders its `Path` with `strokeDashoffset` 0.
  - `ReasonLine` renders both strings.
- [ ] **Step 3: Run the tests.** Run `node --experimental-strip-types --test lib/contours.test.ts` and `npx jest tests/craft-kit.test.tsx`. Expect both to fail.
- [ ] **Step 4: Implement.**
  - `contourPaths` uses a seeded PRNG (mulberry32 over a string hash). Each ring is 64 points around a center at about (0.75w, 0.25h). The radius wobbles as `1 + 0.18·sin(3t + s + 0.6k) + 0.09·sin(5t − 1.3s + k)`, matching the mockup's `contours()`.
  - Odometer digits are a vertical strip of 0–9 twice over, translated by `withSpring`.
  - Loader and skeleton loops use `withRepeat(withTiming(...))` and stop under Reduce Motion.
- [ ] **Step 5: Run the tests again.** Expect them to pass. Then run `npm run typecheck`.
- [ ] **Step 6: Commit** `feat(motion): craft kit visuals`.

### Task 6: Slide to start

**Files:**
- Create: `components/motion/SlideToStart.tsx` (re-export it from `index.tsx`)
- Test: `tests/slide-to-start.test.tsx`

**Interfaces:**
- Consumes: `haptics` from Task 5.
- Produces: `<SlideToStart label: string; a11yLabel: string; onComplete: () => void; disabled?: boolean />`

- [ ] **Step 1: Write failing tests.**
  - The root has `accessibilityRole="button"`, the label from `a11yLabel`, and `accessibilityActions` containing `activate`.
  - Calling `onAccessibilityAction({ nativeEvent: { actionName: 'activate' } })` calls `onComplete` once.
  - With `disabled`, `activate` does nothing.
- [ ] **Step 2: Run `npx jest tests/slide-to-start.test.tsx`.** Expect it to fail.
- [ ] **Step 3: Implement it with a `Gesture.Pan()` from react-native-gesture-handler.**
  - The track is 62 px tall, and the bone knob is 52 px.
  - A fill grows behind the knob as it moves.
  - The label has a sheen loop, which stops under Reduce Motion.
  - Releasing past 85% of the track snaps to the end, calls `haptics.success()`, then `onComplete` via `runOnJS`.
  - Releasing earlier springs back with no call.
  - `haptics.tapLight()` fires when the drag begins.
  - Pan uses mouse events on web; check at 390×844.
- [ ] **Step 4: Run the tests.** Expect them to pass.
- [ ] **Step 5: Commit** `feat(motion): slide to start`.

### Task 7: Elevation scrubber and route tracer

**Files:**
- Create: `components/craft/ElevationScrubber.tsx` and `components/craft/RouteTracer.tsx`
- Test: `tests/elevation-scrubber.test.tsx`

**Interfaces:**
- Consumes: `scrubAt`, `routeFraction`, `ticksCrossed` and `canScrub` from Task 1; `DrawIn`, `haptics` and `Eyebrow` from Task 5; `formatElevation` and `formatDistance` from `lib/format.ts`.
- Produces:
  - `<ElevationScrubber profile: ElevationSample[]; onScrub?: (routeFraction: number) => void; shape?: TrailShape | null />`. It renders `null` when `!canScrub(profile)`.
  - `<RouteTracer path: GeoJSONLineString; fraction: SharedValue<number> | number />`. It renders `null` for fewer than 2 coordinates.

- [ ] **Step 1: Write failing tests.**
  - With a 3-sample profile, the root has `accessibilityRole="adjustable"` and the label `"Elevation profile"`.
  - Its `accessibilityValue.text` starts as `"0.0 mi, 1,000 ft elevation, 0 ft climbed"`. Use feet values in the fixture.
  - An `increment` action moves it by 0.1 of the distance, and the value text updates.
  - `decrement` at the start stays at 0.
  - An empty profile renders `null`.
  - `RouteTracer` with a 1-point path renders `null`.
- [ ] **Step 2: Run `npx jest tests/elevation-scrubber.test.tsx`.** Expect it to fail.
- [ ] **Step 3: Implement both components.**
  - **Readout:** three columns (AT, ELEVATION, CLIMBED) above a 120 px SVG.
  - **Chart:** an area at 35% opacity, the climbed area clipped to the scrub position, the line drawn in with `DrawIn`, a vertical rule, and a 12 px dot.
  - **Dragging:** `Gesture.Pan()` on the chart sets the fraction, with `haptics.tapLight()` whenever `ticksCrossed` > 0 between frames.
  - **Arrival:** after 1.4 s, ease the fraction from 0 to the summit sample (the highest elevation) over 2.2 s, once. Skip this under Reduce Motion.
  - **Route tracer:** a 120 × 120 SVG of the projected path. Latitude is scaled by 1.25 for these latitudes, like the mockup. It shows a grey full line, a bone line drawn to `routeFraction`, a start dot and a moving dot.
- [ ] **Step 4: Run the tests.** Expect them to pass.
- [ ] **Step 5: Commit** `feat(craft): elevation scrubber and route tracer`.

### Task 8: Trail detail screen

**Files:**
- Create: `data/trailNotes.ts`
- Create: `components/craft/DifficultyCard.tsx`
- Modify: `app/trail/[id].tsx`, `components/trail/TrailHero.tsx`
- Modify: `app/(tabs)/log.tsx`. Extract the start flow and read a `start` param.
- Test: `tests/trail-detail.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 5, 6 and 7. `difficultyRating` from `lib/trailDifficulty.ts`.
- Produces:
  - `TRAIL_NOTES: Record<string, { route?: string; flags?: string[] }>`, keyed by catalog trail id (the `id` in `data/catalogTrails.json`).
  - `trailNotes(id: string): { route?: string; flags?: string[] }`, which returns `{}` when there's no entry.
  - The Log route accepts `/log?start=<trailId>`.

- [ ] **Step 1: Write `data/trailNotes.ts` for the 22 catalog trails.**
  - Write one route sentence of 25 words or fewer per trail, plus flags only from this set: `Permit required`, `Chains section`, `Seasonal closure`, `Exposure`, `Water crossing`, `Shuttle`.
  - Every claim must be checkable on the managing agency's page, such as NPS or USFS. Put that URL in a comment above each entry.
  - Leave out anything you can't verify. An empty entry is fine.
- [ ] **Step 2: Write failing tests in `tests/trail-detail.test.tsx`.** Render the screen with a mocked trail cache and router.
  - A catalog trail with notes shows its flags as chips and its route sentence.
  - `trail-unmapped`, which has no profile, renders with no scrubber and no crash.
  - Activating the slider calls `router.push('/log?start=<id>')`.
- [ ] **Step 3: Run `npx jest tests/trail-detail.test.tsx`.** Expect it to fail.
- [ ] **Step 4: Rebuild the screen in this order, to match `craft-screens.html` (first phone).**
  1. **Hero (`TrailHero`):** add `ContourTexture` (seeded with the trail id), the eyebrow `"{region} · {shape label}"`, the name in Display style, and chips.
     - Chips: the flags, then `"Unranked"` or the existing placement label.
     - Flags use the `fine` color at 35% border and 8% fill. Other chips use `fg` at 8%.
  2. **Scrubber card:** `ElevationScrubber`. This replaces `ElevationSparkline` on this screen only.
  3. **Route card:** `RouteTracer` on the left. On the right: an eyebrow, a heading `"{distance} {shape === 'out-and-back' ? 'round trip' : ''}"`, and the route sentence. `TrailMap` stays below for the full map.
  4. **`DifficultyCard`:** a 5-step bar from `difficultyRating().level`, the line `"NPS SHENANDOAH RATING · {score}"`, and `ReasonLine`s from `difficultyReasons`.
  5. **`TrailStats`:** keep it, below the difficulty card.
  6. **`SlideToStart`:** fixed 16 px above the tab bar, with `label="Slide to start this hike"`, `a11yLabel="Start this hike"`, and `onComplete={() => router.push(`/log?start=${trail.id}`)}`.
     - Hide it while `useTrailTracker().isTracking`.
     - Add bottom padding so content clears it.
- [ ] **Step 5: Change `app/(tabs)/log.tsx`.**
  - Extract `beginTracking(trailId: string)` from the "Start tracking" `onPress`. It's the explainer check, then `tracker.start`.
  - Add `start?: string` to `useLocalSearchParams`. When it's present and the tracker is hydrated and not tracking, call `setSelectedTrailId(start)` and `beginTracking(start)`, then `navigation.setParams({ start: undefined })`.
  - When already tracking, only clear the param.
  - Add a test for the already-tracking case to `tests/trail-detail.test.tsx`, or to a new `tests/log-start-param.test.tsx`.
- [ ] **Step 6: Run the tests, `npm run typecheck`, and web at 390×844.** Check Angels Landing against the mockup.
- [ ] **Step 7: Commit** `feat(trail): craft trail detail`.

### Task 9: Log screen

**Files:**
- Create: `components/craft/SummitRegister.tsx` and `components/craft/StreakGrid.tsx`
- Modify: `components/log/LogHeader.tsx`, `app/(tabs)/log.tsx`
- Test: `tests/summit-register.test.tsx`

**Interfaces:**
- Consumes: Tasks 2, 3, 5 and 6. `useWeeklyGoal` from `hooks/useWeeklyGoal.ts`; `weeklyStreak` from `lib/streak.ts`; `describePlacement` from `lib/ranking.ts`; `ScoreBadge`.
- Produces:
  - `<SummitRegister log: HikeLog | null; trail: Trail | null; number: number; reasons: { distance: string | null; climb: string | null; time: string | null }; rank: { bucket: Bucket; count: number; score: number; ordinal: number; total: number; reason: string | null } | null; onOpen?: () => void />`. With `log={null}` it renders the empty state.
  - `<StreakGrid grid: DayLevel[][]; streakWeeks: number />`

- [ ] **Step 1: Write failing tests.**
  - The register shows `"No. 0007"` for `number={7}`, the trail name, `"5.6 MI"` and `"1,942 FT"`.
  - It shows the summit stamp text `"5,791 FT"` only when `trail.peak_elevation_m` is set.
  - A reason appears under its line only when it isn't null.
  - The rank line reads `"Ranked #2 of 7"`, followed by the reason.
  - `log={null}` shows `"Your first hike prints here"`.
- [ ] **Step 2: Run `npx jest tests/summit-register.test.tsx`.** Expect it to fail.
- [ ] **Step 3: Implement `SummitRegister`.**
  - **Card:** paper `#F3EFE4` with `#151515` ink, in both appearances. Add both literals to `theme/tokens.ts` as `paper` and `ink`. Scalloped top and bottom edges use an SVG mask.
  - **Type:** mono for body lines; Display for the name.
  - **Stamp:** green at 55% alpha, rotated −14°.
  - **Trace:** an elevation trace from the trail profile.
  - **Arrival:** it "prints" once with a clip reveal (1.6 s, delay 0.4 s), skipped under Reduce Motion.
  - **Tap:** `onOpen` opens `/trail/{trail.id}`.
- [ ] **Step 4: Implement `StreakGrid`.**
  - The grid is 12 columns × 7 rows of rounded squares. Level 2 is `accent`, level 1 is `accent` at 35%, and level 0 is `raised`.
  - The header shows an eyebrow `"Last 12 weeks"` and `"{n}-week streak"` (hidden at 0).
  - The legend reads `{first Monday, short}`, `"■ FULL HIKE  ▪ SHORT HIKE"` and `"NOW"`.
- [ ] **Step 5: Rebuild the Log tab's Hikes view, to match `craft-screens.html` (second phone).**
  - **Contour texture** at the top.
  - **Eyebrow:** `"This week · {Mon d–Sun d}"`.
  - **`Odometer`:** `progress.done` formatted with `formatAmount(goal.metric, …)`, plus a unit label (`"FT CLIMBED"` or `"MI HIKED"`).
  - **Line under the odometer:** `"Climbed across {n} hikes. {left} to your weekly goal."`, or `"Goal met this week."`.
  - **Hikes/Rankings switch:** the existing control, styled to the card rule.
  - **`StreakGrid`.**
  - **Latest hike:** eyebrow `"Latest · Summit register"`, then `SummitRegister` for the newest log.
    - Reasons come from `hikeReasons` against the other logs. Build each argument with `distance_km` and `elevation_gain_m` taken from the log, falling back to its trail's values, the same way `weeklyProgress` does.
    - The rank comes from `describePlacement`, and `rankReason` takes the neighbor trail names at `ordinal ± 1`.
    - `number` is `logs.length`.
  - **Log history:** keep the existing list below it, with the card rule applied.
- [ ] **Step 6: Change how starting works on Log.**
  - In `LogHeader`, replace "Start a hike" with a secondary text link, "Pick a trail first", which keeps today's `onStart` select flow. Keep "Log past hike".
  - Add `SlideToStart` fixed above the tab bar, with `label="Slide to start a hike"`, `a11yLabel="Start a hike"`, and `onComplete={() => beginTracking(FREEFORM)}`. Freeform means "name it at the end", which already suggests matching trails when the hike finishes.
  - Hide the slider while tracking or while the select flow is open.
- [ ] **Step 7: Run the tests, typecheck, and web at 390×844.** Check both the empty and one-hike states.
- [ ] **Step 8: Commit** `feat(log): odometer, streak grid, summit register`.

### Task 10: Weekly goal screen

**Files:**
- Create: `components/craft/GoalDial.tsx` and `components/craft/WeekBars.tsx`
- Modify: `app/goal.tsx`
- Test: `tests/goal-dial.test.tsx`

**Interfaces:**
- Consumes: Tasks 4 and 5. `useGoal`, `useWeeklyGoal` and `useTrailCache`.
- Produces:
  - `<GoalDial metric: GoalMetric; display: number; onChange: (display: number) => void />`
  - `<WeekBars totals: number[]; targetStored: number />`

- [ ] **Step 1: Write failing tests.**
  - The dial has `accessibilityRole="adjustable"` and `accessibilityValue.text` `"3,000 feet a week"`.
  - `increment` calls `onChange(3250)`, and `decrement` at 1000 stays at 1000.
  - For distance, `increment` from 10 calls `onChange(11)`, and the value reads `"10 miles a week"`.
- [ ] **Step 2: Run `npx jest tests/goal-dial.test.tsx`.** Expect it to fail.
- [ ] **Step 3: Implement `GoalDial`.**
  - **Size:** 280 px.
  - **Ticks:** 61 of them over `DIAL_SWEEP_DEG` from `DIAL_START_DEG`, with every 5th one long. Labels sit at every 15th tick.
  - **Arc and knob:** a bone arc to the current value, a 9 px knob, and a raised center disc showing the eyebrow `"WEEKLY TARGET"`, the value in Display 40, and `"feet of climbing"` or `"miles"`.
  - **Dragging:** `Gesture.Pan()` maps each position to `angleToDisplay`. Call `haptics.select()` only when the snapped value changes. Call `onChange` live.
- [ ] **Step 4: Implement `WeekBars`.** Seven columns labelled M T W T F S S. Bars grow from the bottom with `GrowBar` behavior, rotated or vertical. Hiked days are `accent`, others are `raised`. A dashed line sits at `target / 7` with the eyebrow `"DAILY PACE"` on the left.
- [ ] **Step 5: Rebuild `app/goal.tsx` to match `craft-screens.html` (third phone).**
  1. Title `"Set your climb for the week"`, or `"Set your miles for the week"` for distance.
  2. The metric `ChoiceRow`, kept above the dial.
  3. `GoalDial`, writing through `setTarget(toStored(metric, display))`.
  4. The `"This week"` card: done and target on the right, `WeekBars` from `dailyTotals`, then `paceLine` with a dot in `loved` (good or done) or `fine` (behind).
  5. The `"What counts"` card with three numbered steps. The copy is in the mockup.
  - Remove the preset `ChoiceRow`. The dial replaces it.
  - Saved targets outside the dial's range clamp on display only; don't rewrite the store until the user turns the dial.
- [ ] **Step 6: Run the tests, typecheck, and web at 390×844,** in both metrics.
- [ ] **Step 7: Commit** `feat(goal): goal dial and week bars`.

### Task 11: Kit rollout across the app

**Files:**
- Modify:
  - `components/social/Buttons.tsx`
  - `app/notifications.tsx`, `app/blocked.tsx`, `app/friend/[id].tsx`, `app/post/[id].tsx`, `app/username.tsx`, `app/(tabs)/index.tsx`, `app/trails.tsx`, `app/friend-requests.tsx`
  - `components/groups/GroupsSection.tsx`, `components/ranking/PairwiseModal.tsx`, `components/ranking/RankingsList.tsx`, `components/feed/PostCard.tsx`, `components/social/SignInGate.tsx`
  - `app/(tabs)/_layout.tsx`, `theme/tokens.ts` (`tabBarStyle`)
  - `components/log/PastHikeSheet.tsx`, `components/log/TrailAssignSheet.tsx`
  - `app/account.tsx`, `app/credits.tsx`, `app/delete-account.tsx`
  - `package.json`
- Create: `components/motion/Glass.tsx`
- Test: update the existing tests that break. Add a case to `tests/rankings-list.test.tsx` for the reason line.

**Interfaces:**
- Consumes: Task 5 (`ContourLoader`, `Skeleton`, `ReasonLine`, `DrawIn`, `Eyebrow`, `ContourTexture`) and Task 2 (`rankReason`).
- Produces: `<Glass style?; children; intensity?: number />`. It uses `BlurView` from `expo-blur` on iOS and web, and a plain `surface` fill at 85% on Android.

- [ ] **Step 1: Install blur.** Run `npx expo install expo-blur`. Write `Glass`, and apply it to the tab bar (`tabBarStyle` gets a transparent background, with `tabBarBackground: () => <Glass/>` in `_layout.tsx`) and to the two sheets' panels.
- [ ] **Step 2: Replace loading states.**
  - Buttons: `ActivityIndicator` becomes `ContourLoader size="sm" color={c.onAccent}`.
  - `notifications`, `blocked`, `friend/[id]`, `post/[id]` and `username`: `return null` or a blank view becomes `Skeleton shape="row" count={5}`, or `"post"` for the post screen.
  - Feed loading (`app/(tabs)/index.tsx:175`): `Skeleton shape="post" count={3}`.
  - Trails list: `Skeleton shape="card"` before trails load.
  - `PairwiseModal` "Preparing comparison": `ContourLoader size="screen" label="Preparing comparison"`.
- [ ] **Step 3: Update `RankingsList` rows.** Each row gets one `ReasonLine`-styled line from `rankReason`, with neighbors by order. Write the failing test first, then make it pass.
- [ ] **Step 4: Update `PostCard`.** Its route uses `DrawIn`. Under the stats, add up to two reasons from `hikeReasons`, comparing against that author's other posts in the loaded feed only.
- [ ] **Step 5: Apply the card, eyebrow and contour-header rules.**
  - Card and eyebrow rules: `SignInGate`, `account`, `credits`, `delete-account`, `GroupsSection` and `friend-requests`.
  - `ContourTexture` header: `SignInGate`.
- [ ] **Step 6: Run `npm test` and `npm run typecheck`.** Then re-run the screenshot pass on web at 390×844 into `docs/screens/`, using the script described in Task 12, and check every changed screen in both appearances.
- [ ] **Step 7: Commit** `feat(ui): craft kit across the app`.

### Task 12: Verification pass

**Files:**
- Create: `scripts/capture-screens.mjs`. This is the Playwright script from the 2026-11-21 session, made repeatable: every route, both appearances, at 390×844 and 2×, into `docs/screens/`.
- Modify: `docs/superpowers/plans/2026-10-16-launch-roadmap.md` (record what's owed for the phone pass)

- [ ] **Step 1: Capture.** Run `node scripts/capture-screens.mjs` with the web server up. Expect PNGs for every route in both appearances.
- [ ] **Step 2: Compare.** Check Trail detail, Log and Goal against `craft-screens.html` and fix any differences that matter.
- [ ] **Step 3: Check Reduce Motion.** Run the capture with `reducedMotion: 'reduce'` in the Playwright context. Expect static loaders, fully drawn lines, final odometer digits and no sheen.
- [ ] **Step 4: Phone pass.** Rebuild the dev client for `expo-blur`. Check:
  - 60 fps while scrubbing Angels Landing and turning the dial
  - haptic ticks every 500 ft and on each dial snap
  - VoiceOver operates the scrubber, slider and dial
  - the recording screen has no motion
  - `/log?start=` while recording doesn't start a second hike
- [ ] **Step 5: Commit** `chore: craft pass verification and screen capture script`.
