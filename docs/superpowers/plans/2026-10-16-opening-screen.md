# Opening Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On every plain cold launch, show a full-bleed, slowly drifting photo of one of the world's hardest trails, climbs or treks, with poster typography and a "Did you know" fact, then hand off to the tabs.

**Architecture:** Pure data (`data/heroPlaces.ts`) and pure logic (`lib/hero*.ts`, node tests) are kept apart from bundled images (`data/heroPhotos.ts`, jest test) and the view (`components/opening/OpeningScreen.tsx`). The root layout mounts the opening screen as an overlay above the `Stack`, so the tabs render underneath and are ready when it fades.

**Tech Stack:** Expo SDK 57, Reanimated (Ken Burns, fade), expo-image (decode, `onLoad`), react-native-svg (bottom gradient), `@expo-google-fonts/anton`, AsyncStorage (rotation bag).

**Spec:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md`, section "1. Opening screen". Visual reference: `.superpowers/brainstorm/12249-1792163014/content/opening-screen-v2.html`, option A2.

## Global Constraints

- Read the Expo SDK 57 docs before writing code (`AGENTS.md`). Add packages with `npx expo install`, never bare `npm install`.
- No box or background behind the fact: a small divider, a small label, one or two lines of text, soft text shadow. "The photo stays the hero."
- Every photo is licensed (Unsplash license, or CC from Wikimedia with credit), and every fact carries a source URL in the data file.
- Must hold 60 fps on a recent iPhone. Respect Reduce Motion.
- Theme hex values live only in `theme/tokens.ts`.
- Merge commits, PR based on main.

**My calls the spec left open (flag to owner in the PR):**
- Dismissal: auto-continue after 4500 ms, or tap anywhere to continue sooner. 400 ms fade.
- Rotation: a shuffled bag, so every place shows once before any repeats, and never the same place twice in a row.
- Elevation shows in feet (`22,349 FT`) until roadmap plan 0 adds the units setting.
- Mono text uses the existing SpaceMono instead of adding JetBrains Mono.

## Review Focus

1. **Cold start from a Pause or Finish notification link, or with a hike still recording** → skip the opening screen and go straight in (Task 2 `shouldShowOpening` tests; Task 4 wiring).
2. **Photo fails to load or decodes slowly** → never a white or black flash and never a stuck splash; hide the native splash on image load or after 1500 ms, whichever comes first (Task 4 step).
3. **AsyncStorage empty, corrupt, or throwing** → still show a place; rotation starts a fresh bag (Task 2 tests).
4. **Reduce Motion on** → static photo, no drift; fade still allowed (Task 3 step).
5. **Long place names and facts** (e.g. "Tour du Mont Blanc", a two-line fact on an iPhone SE width) → name wraps to at most two lines and shrinks to fit; fact never runs under the home indicator (Task 3 step, Task 5 data test caps fact length at 140 characters).

---

### Task 1: Place data model and elevation format

**Files:**
- Create: `types/hero.ts`, `lib/heroFormat.ts`, `lib/heroFormat.test.ts`
- Modify: `package.json` `scripts.test` (add `lib/heroFormat.test.ts` and, in Task 2, `lib/heroRotation.test.ts` to the node list)

**Interfaces:**
- Produces:
  ```ts
  export type HeroKind = 'peak' | 'climb' | 'trek' | 'trail';
  export type HeroPlace = {
    id: string;              // kebab-case, unique
    name: string;            // display name, e.g. "Ama Dablam"
    elevationM: number;      // summit or high point, metres
    region: string;          // e.g. "Khumbu"
    country: string;         // e.g. "Nepal"
    kind: HeroKind;
    grade: string;           // e.g. "Grade V", "5.14d", "Class 3"
    fact: string;            // ≤ 140 chars, verified
    factSource: string;      // https URL
    photoCredit: { author: string; license: 'Unsplash' | 'CC BY' | 'CC BY-SA'; url: string };
  };
  export function formatHeroElevation(elevationM: number): string; // feet, uppercase unit
  ```

- [ ] **Step 1: Write the failing test** in `lib/heroFormat.test.ts` (node:test style, as in `lib/format.test.ts`):
  ```ts
  assert.equal(formatHeroElevation(6812), '22,349 FT');
  assert.equal(formatHeroElevation(8849), '29,032 FT');
  assert.equal(formatHeroElevation(0), '0 FT');
  assert.equal(formatHeroElevation(Number.NaN), '–');   // MISSING_METRIC from lib/format.ts
  ```
- [ ] **Step 2:** `node --experimental-strip-types --test lib/heroFormat.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Create `types/hero.ts` and implement `formatHeroElevation` (round `m * 3.28084`, `en-US` grouping, non-finite → `MISSING_METRIC`).
- [ ] **Step 4:** Rerun → PASS. Add the file to `scripts.test`; `npm test` → all pass.
- [ ] **Step 5: Commit** `Add the opening-screen place type and elevation format.`

### Task 2: Rotation and when to show

**Files:**
- Create: `lib/heroRotation.ts`, `lib/heroRotation.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function nextFromBag(
    allIds: readonly string[], bag: readonly string[], lastId: string | null, random: () => number,
  ): { id: string; bag: string[] };
  export function shouldShowOpening(input: { initialUrl: string | null; hasActiveHike: boolean }): boolean;
  export function loadHeroState(): Promise<{ bag: string[]; lastId: string | null }>;   // AsyncStorage key 'apex.hero.v1'
  export function saveHeroState(state: { bag: string[]; lastId: string | null }): Promise<void>;
  ```

- [ ] **Step 1: Write the failing tests:**
  - `nextFromBag` with an empty bag refills from `allIds`, returns an id in `allIds`, and the returned bag has `allIds.length - 1` entries.
  - Drawing `allIds.length` times in a row (feeding the bag back) yields every id exactly once.
  - When a refill's first draw would equal `lastId`, it picks a different id (use a `random` stub returning 0 so the collision is forced). With one id total, it returns that id.
  - Bag ids no longer in `allIds` are dropped before drawing.
  - `shouldShowOpening({ initialUrl: null, hasActiveHike: false })` → `true`; `'apex://'` → `true`; `'apex:///log?recording=finish'` (the recording notification's link) → `false`; any URL with a path or query → `false`; `hasActiveHike: true` → `false`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. `loadHeroState` returns `{ bag: [], lastId: null }` when the key is missing, unparsable, the wrong shape, or `getItem` throws. `saveHeroState` swallows errors. Check the scheme in `app.json` and use it in the tests.
- [ ] **Step 4:** Run → PASS; add to `scripts.test`; `npm test` → all pass.
- [ ] **Step 5: Commit** `Rotate opening-screen places and skip them for links and live hikes.`

### Task 3: The opening screen view

**Files:**
- Create: `components/opening/OpeningScreen.tsx`
- Modify: `theme/tokens.ts` (add `fonts.poster: 'Anton_400Regular'` and a `colors.heroAccent` for the elevation, matching the mockup's orange `#FF8A4C`), `app/_layout.tsx` (register the Anton font only)
- Packages: `npx expo install expo-image @expo-google-fonts/anton`

**Interfaces:**
- Consumes: `HeroPlace`, `formatHeroElevation` (Task 1).
- Produces: `export function OpeningScreen(props: { place: HeroPlace; photo: ImageSource; onReady: () => void; onDone: () => void }): JSX.Element` — absolutely fills the screen. Calls `onReady` once on image load or error, and `onDone` once after the fade-out.

- [ ] **Step 1:** Install packages, register Anton in `useFonts`, add tokens.
- [ ] **Step 2:** Build the layout to match mockup A2:
  - Photo: `expo-image`, `contentFit="cover"`, inset −6% so the drift never shows edges.
  - Drift: Reanimated, scale 1 → 1.12 and translate (−2%, −3%), 18 s, `withRepeat(…, -1, true)`, ease in-out. Static when `useReducedMotion()` is true.
  - Shade: an SVG `LinearGradient` with black at 0.30 → 0 over the top 28%, clear to 52%, then 0 → 0.78 at the bottom.
  - Wordmark "APEX" top center under the safe area, Bricolage 800, 12 pt, letter-spacing 0.4em.
  - Name: Anton, uppercase, centered, 60 pt with line height 0.86. `adjustsFontSizeToFit` with `numberOfLines={2}`.
  - Stats row: a three-column grid centered under the name. Left is `region` / `country` and right is `grade` / `kind`, in SpaceMono 9 pt, letter-spacing 0.14em, 75% opacity. The middle is `formatHeroElevation`, SpaceMono 15 pt in `heroAccent`, between 1 px rules at 35% white.
  - Fact: no container. A 28 px × 1 px rule at 50% white, a "DID YOU KNOW" label (SpaceMono 8.5 pt, letter-spacing 0.22em, 65% opacity), then the fact in Inter 500 at 12.5–14 pt, centered, with `textShadow` black 60% and radius 12. Sit it above the bottom safe-area inset.
- [ ] **Step 3: Behaviour.**
  - The whole screen is a `Pressable` with `accessibilityRole="button"` and `accessibilityLabel` = `` `${name}. ${fact}. Double tap to continue.` ``.
  - Tap, or 4500 ms after `onReady`, starts a 400 ms opacity fade to 0, then calls `onDone`. A second tap is ignored.
  - Haptic: none.
- [ ] **Step 4: Verify on the iOS simulator** with two places: the shortest name with a one-line fact, and the longest name with a 140-character fact. Check iPhone SE (3rd gen) and iPhone 17 Pro Max sizes, plus Reduce Motion on. Screenshot each. Check that the drift is smooth in a Release build (`npx expo run:ios --configuration Release`).
- [ ] **Step 5: Commit** `Add the opening screen view.`

### Task 4: Show it on cold launch

**Files:**
- Modify: `app/_layout.tsx`, `lib/activeHike.ts` (only if `hydrateHike`'s result isn't already reachable)
- Create: `hooks/useOpeningPlace.ts`

**Interfaces:**
- Consumes: `nextFromBag`, `shouldShowOpening`, `loadHeroState`, `saveHeroState` (Task 2); `OpeningScreen` (Task 3); `HERO_PLACES` and `HERO_PHOTOS` (Task 5; until Task 5 lands, use the two reference entries described in Task 5 step 1).
- Produces: `export function useOpeningPlace(): { status: 'deciding' } | { status: 'skip' } | { status: 'show'; place: HeroPlace; photo: ImageSource }`

- [ ] **Step 1:** Implement `useOpeningPlace`. It reads `Linking.getInitialURL()` (expo-linking) and the result of `hydrateHike()`, and calls `shouldShowOpening`. On show, it loads the state, draws with `nextFromBag(HERO_PLACES.map(p => p.id), …, Math.random)`, and saves the new state without waiting for the save. Reuse the existing `hydrateHike` promise in `_layout.tsx` instead of reading twice.
- [ ] **Step 2:** In `RootLayout`, keep `SplashScreen.hideAsync()` gated on fonts and on `status !== 'deciding'`. When `status === 'show'`, also wait for `OpeningScreen`'s `onReady` or 1500 ms, whichever comes first, so the photo is on screen when the splash lifts. Render `<OpeningScreen>` as a sibling after `<Stack>` inside `BottomSheetModalProvider`, absolutely positioned. Unmount it on `onDone`. While it's shown, set `<StatusBar style="light" />`.
- [ ] **Step 3: Verify on the simulator:**
  - (a) A cold launch shows a place, and the next cold launch shows a different one.
  - (b) A warm resume from the background doesn't show it again.
  - (c) Start a recording, kill the app, relaunch: the opening screen is skipped and the recording resumes.
  - (d) Cold start from a recording notification's Finish action: it goes straight to the finish flow (this exercises `lib/recordingLink.ts`).
  - (e) Delete the AsyncStorage key and relaunch: a place still shows.
- [ ] **Step 4:** `npm test` → all pass. `npx tsc --noEmit` → no errors.
- [ ] **Step 5: Commit** `Show the opening screen on a plain cold launch.`

### Task 5: Curate the launch places

**Files:**
- Create: `data/heroPlaces.ts` (`export const HERO_PLACES: readonly HeroPlace[]`), `data/heroPhotos.ts` (`export const HERO_PHOTOS: Record<string, ImageSource>` via `require('../assets/hero/<id>.jpg')`), `assets/hero/*.jpg`, `tests/hero-places.test.ts`, `docs/hero-credits.md`

- [ ] **Step 1:** Start with two reference entries, so Task 4 can run before curation finishes: `ama-dablam` (6,812 m, Khumbu, Nepal, peak, "Grade V", the "mother's necklace" fact) and `dawn-wall` (El Capitan, Yosemite, USA, climb, "5.14d", 2015 free ascent in 19 days). Each needs a sourced fact and a licensed photo.
- [ ] **Step 2: Write the failing jest test** `tests/hero-places.test.ts`:
  - At least 24 places.
  - Ids are unique kebab-case.
  - Every id has a `HERO_PHOTOS` entry and every photo key has a place.
  - Every `fact` is 20–140 characters.
  - Every `factSource` and `photoCredit.url` starts with `https://`.
  - `elevationM` is finite and greater than 0.
  - At least 6 places are in the USA (launch market), and the kinds include all four `HeroKind`s.
- [ ] **Step 3:** Curate up to at least 24 places. Pick the world's hardest or most extreme trails, climbs and treks, with a good US share. Candidates include: Half Dome cables, Angels Landing, Kalalau Trail, Mount Whitney, Grand Canyon rim-to-rim, Denali, K2, the Eiger north face, Matterhorn, Huashan plank walk, Huayna Picchu, Annapurna Circuit, Torres del Paine W, Cerro Torre, Fitz Roy, Kilimanjaro, Aconcagua, Kokoda Track, Drakensberg Amphitheatre, Tour du Mont Blanc, and Trolltunga.
  - Each photo must actually show that place.
  - Export at 1290 px on the long edge, JPEG quality around 80, under 350 KB. Strip EXIF.
  - Cross-check every fact against its source.
  - Write the credits into `docs/hero-credits.md` and add a "Photo credits" row in Settings that lists them.
- [ ] **Step 4:** `npx jest tests/hero-places.test.ts` → PASS. `npm test` → all pass.
- [ ] **Step 5: Commit** `Add the launch places, photos, and credits.` In the PR, list every fact with its source so the owner can review them before release (spec: "The owner reviews them before release").
