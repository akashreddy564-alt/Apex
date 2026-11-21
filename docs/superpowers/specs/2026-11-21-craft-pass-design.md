# Apex craft pass design

Date: 2026-11-21. Status: draft for owner approval. Replaces this file's earlier "ambient glow" draft from the same day.
Mockups from the session: `.superpowers/brainstorm/8695-1795245136/content/`. **`craft-screens.html` is the reference.** It's interactive: drag the elevation profile, the start slider and the goal dial. `polish-level.html` and `redesign-compare.html` record the earlier choices.
Screens as they are today: `docs/screens/` (web build, 390×844, captured 2026-11-21).
The bar we're aiming for: https://ripegrocery.com/, the owner's earlier site.

## Intent

The owner wants Apex's frontend to look as developed as Ripe. Two earlier rounds missed:

- A pure redesign. The owner kept today's look instead.
- A layer of glow and blur effects. It still looked underdeveloped.

Studying Ripe showed why. Its finish doesn't come from effects. It comes from:

1. **One hands-on idea per section that belongs to the subject.** You wipe fog off a produce case, turn a dial to your store's sales, scrub a chart week by week, or slide to approve.
2. **The product shown as small, finished objects with real content.** For example, a printed order receipt where every line gives its reason.
3. **Numbers that move and explain themselves.** A rolling dollar counter, a 96-of-100 dot grid, bars that grow.
4. **Disciplined type and rhythm.** One family used heavy and tight for headlines, small caps labels, generous space, and the same card build everywhere.

This design brings that level of craft to Apex using hiking's own material: climbs, routes, contours, summits and weekly feet climbed. It keeps today's look: black, one bone accent (#EDE6D6), Bricolage Grotesque titles, Inter text, Space Mono labels, and cinematic photos only on the opening screen.

## Goals

1. **Three signature screens**, built to match `craft-screens.html`: Trail detail, Log and Weekly goal.
2. **A reusable craft kit**, so every other screen gets the same finish: loaders, skeletons, rolling numbers, draw-in lines, reason lines, press feedback and haptics.
3. **No dead states.** Nothing renders blank while loading, and no list is bare when it's empty.
4. **Works on web at 390×844 and on the phone, in both appearances.**

## Non-goals

- A new palette, new fonts or new layouts for the app as a whole. The owner turned down both redesigns.
- The full-screen ambient glow from the earlier draft. The craft screens don't need it (see Calls, item 1).
- A full UI library (HeroUI Native, Tamagui, gluestack).
- Lottie or any other animation-file pipeline.
- Fixing the two bugs found during the screenshot pass. Each gets its own change:
  - A past hike logs **0 ft** of gain.
  - The ranking step stalls on "Preparing comparison" on web.

## Anti-goals (a failure even if it works)

- **Made-up reasons.** Every reason line is computed from real data, or it isn't shown. "22 min faster than your Half Dome pace" only appears if that comparison is true.
- **Gestures that lock people out.** Every drag, slide and dial has a plain alternative for VoiceOver, TalkBack and keyboard users.
- **Jank.** Scrubbing or turning the dial must stay at 60 fps on the phone.
- **Motion during recording.** The recording screen stays still.
- **A broken or degraded web build.**
- **Copied code with an unchecked license.**

## Constraints

- **Stack:** Expo SDK 57, Reanimated plus worklets, react-native-svg, `@shopify/react-native-skia` (native only today), NativeWind, `expo-haptics`. Read the SDK 57 docs before writing code (AGENTS.md).
- **Everything in this design is buildable with Reanimated and SVG**, so it runs on web with no Skia. Skia stays optional, for native only, if a piece needs more speed.
- **Colors and fonts come from `theme/tokens.ts` only.** Both appearances must look right.
- **Reduce Motion:** looping and entering animations stop or show their end state.
- **Checks:**
  - Every step: `npm run typecheck` and `npm test`.
  - UI: web at 390×844.
  - Phone: one pass at the end.
- **Sources:** port patterns from [Reacticx](https://www.reacticx.com/) and the other libraries found in this session, only under permissive licenses (MIT, Apache-2.0, BSD). Each ported file names its source and license in its header.

## Approaches considered

1. **Extend our own kit, adapting code from mobile sources (chosen).** Grow `components/motion/` into the craft kit and build the signature components on it. The code is ours, uses Apex tokens, and works on web.
2. **Install Reacticx components and shader packages as they are.** Faster to start, but they come with their own styling, a Skia version that clashes with ours, and extra native modules.
3. **Adopt a full UI library.** That means a restyle of the whole app, so it's really a redesign.

The owner picked approach 1. They picked the "B · Ambient" level of polish first, then asked for Ripe's level of craft. This design is the result.

## Design system rules

These keep every screen looking as if one person built it, the way Ripe does.

- **Eyebrow:** Space Mono, 10 px, uppercase, 0.16 em tracking, `fgMuted`. It goes above every card title and section.
- **Display:** Bricolage Grotesque 800, uppercase, tight leading (0.88) and slight negative tracking, for screen titles and trail names. Bricolage 700 for card headings.
- **Numbers:** tabular figures everywhere. A unit after a number is set smaller in `fgMuted` (for example, 1,942 ft).
- **Cards:** one build everywhere. `surface` fill, a `border`-strength hairline, 22 px radius, 16 px padding. The only exceptions are the summit register and the glass bars.
- **Reason line:** a bold value on the left, then one short muted sentence explaining it. It's used anywhere a number needs context.
- **Signature texture:** contour lines. They're generated loops that look like a topo map, drawn at low opacity in bone, used behind heroes and screen headers, and never inside lists.
- **Copy:** plain and specific, with no exclamation marks. A reason only appears when the data supports it.

## Signature screens

### Trail detail (`app/trail/[id].tsx`, `components/trail/*`)

- **Hero:** the cover photo, darkening into the background at the bottom, with contour texture over it. Then an eyebrow (region · shape), the trail name in Display, and chips. The chips show the trail's flags from new optional catalog fields, plus ranked or unranked.
- **Elevation scrubber (new `ElevationScrubber`):** a readout of position, elevation and feet climbed so far, above the trail's real `elevation_profile`.
  - Dragging moves a vertical rule and a dot along the profile and updates the readout.
  - The part already climbed fills in.
  - A light haptic tick fires every 500 ft of elevation crossed.
  - On first appearance the line draws in, then the dot eases from the trailhead to the summit once.
  - **Accessibility:** the scrubber is an adjustable element. Swiping up or down steps it by about a tenth of a mile and reads the readout aloud.
- **Route tracer (new `RouteTracer`):** a mini map of the real route over a faint contour background. Its dot follows the scrubber. On out-and-back trails, the far end of the profile maps back down the route.
- **Difficulty card:**
  - a 5-step bar
  - the source rating line (today's NPS Shenandoah rating)
  - three reason lines computed from catalog data: total climb and where most of it happens, climb per mile, and summit elevation
- **Slide to start (new `SlideToStart`), fixed above the tab bar:** sliding it starts recording with this trail already selected. A light haptic fires at the start of the slide and a success haptic at the end. Assistive tech sees a plain button labeled "Start this hike."

### Log (`app/(tabs)/log.tsx`)

- **Weekly odometer (new `Odometer`, extends `CountUp`):** this week's feet climbed (or miles, if that's the goal metric) in split-flap digits that roll into place. A line below says how many hikes and how far there is to the goal.
- **Hikes / Rankings switch:** the existing control, restyled to the new rules.
- **Streak grid (new `DotGrid`):** 12 weeks by 7 days.
  - Each dot's brightness is that day's climb: no hike, a short hike, or a full hike, with thresholds set by the builder.
  - The header shows the current streak from `lib/streak.ts`.
- **Summit register (new `SummitRegister`):** the latest hike as a paper-receipt card that "prints" in once when the screen opens.
  - **Header:** a hike number (your count of hikes), the date and time, and the trail name in Display.
  - **Stamp:** a summit stamp when the trail has a peak elevation.
  - **Body:**
    - an elevation trace
    - distance, climb and moving time, each with a reason line when one is true
    - the score badge with its rank ("Ranked #2 of 7, above X, below Y")
  - Tapping it opens the hike.
- **Slide to start** a hike, the same component as on Trail detail.
- **Empty state:** a register with dashed placeholders that says "Your first hike prints here," plus the slider.

### Weekly goal (`app/goal.tsx`, `components/habit/GoalRing.tsx`)

- **Goal dial (new `GoalDial`):** an altimeter-style dial with ticks and labels.
  - Drag the knob to set the target. It snaps to 250 ft, or 1 mi for distance, across each metric's preset range.
  - A selection haptic fires on each snap.
  - The center shows the target. Saving it updates `stores/goalStore.ts`.
  - **Accessibility:** it's an adjustable element that steps to the next snap point.
- **Week bars:** one bar per day for this week, with a dashed daily-pace line. They grow in, and they update as the dial turns.
- **Pace line:** a colored dot and one sentence, computed from what's done, the target, and the days left.
- **What counts:** a numbered three-step list of the existing rules, matching Ripe's "How it works."

## The craft kit (`components/motion/`, re-exported from `index.tsx`)

| Part | Use |
|---|---|
| `PressScale`, `riseIn`, `CountUp`, `GrowBar` | Existing. Keep them. |
| `Odometer` | Rolling split-flap digits for headline numbers |
| `DrawIn` | Strokes an SVG path in once, on first appearance |
| `ContourTexture` | The signature contour background, generated from a seed (each trail can use its id as the seed) |
| `ContourLoader` | Rings that spread from a point and fade, in small, medium and screen sizes. Replaces `ActivityIndicator` in `components/social/Buttons.tsx`, the screens that return `null` or a blank view while loading (`notifications`, `blocked`, `friend/[id]`, `post/[id]`, `username`), and "Preparing comparison" in `PairwiseModal` |
| `Skeleton` | Shimmer placeholders shaped like rows, cards and feed posts. Used for the feed, trails list, notifications, friend requests and groups |
| `ReasonLine` | A bold value plus a muted reason |
| `SlideToStart` | See Trail detail |
| `Glass` | A translucent, blurred surface (`expo-blur`; a plain translucent fill on Android) for the tab bar and bottom sheets only |
| `haptics` | `tapLight`, `select`, `success`. Do nothing on web |

## The rest of the app

The other screens don't get new layouts. They pick up the kit and the rules:

- **Home feed (`PostCard`):** the route draws in, the score uses the score badge, and up to two reason lines appear under the stats. Skeleton posts show while loading.
- **Rankings:** each row shows its score badge and one reason line ("Above Mission Peak").
- **Trails list:** skeleton cards while loading. Cover cards get `PressScale`.
- **Social screens and the sign-in gate:** cards rebuilt to the card rule, a contour texture header, skeletons and loaders.
- **Settings, credits, delete account:** cards and eyebrows rebuilt to the rules.
- **Tab bar and sheets** (`PastHikeSheet`, `TrailAssignSheet`, `PairwiseModal`): `Glass` and a spring entrance.
- **Opening screen and recording screen:** no change.

## Calls I made (owner may change)

1. **The full-screen glow is dropped.** The craft screens carry the polish, and contour lines are the signature texture instead. The glow could come back later behind headers only.
2. **Trail chips and route notes come from new optional catalog fields:** a short route description and flags such as "Permit required" or "Chains section." They're curated by hand for the 22 seed trails and hidden when missing. User-made trails show none.
3. **The streak grid shows hikes only.** The mockup's "walked" category is dropped, because Apex doesn't track walks.
4. **The summit register's hike number is your total count of hikes.** That gives the receipt look without a new field.
5. **The dot eases to the summit once on arrival.** After that it only moves with your finger.
6. **The tab bar and sheets get `Glass`. Cards stay solid,** which is closer to Ripe's clean cards.

## Left to the builder

- Contour generation details: the noise function and number of rings. Keep it cheap, and memoize per seed.
- Day thresholds for the streak grid, and the rules for each reason line, as pure functions in `lib/` with node tests.
- How Trail detail passes the chosen trail into recording. `app/(tabs)/log.tsx` already reads route params; extend that.
- Timings, easings and haptic strength, judged on the phone.
- Whether any piece needs Skia on native to hold 60 fps.

## How we'll check it

- Every step: `npm run typecheck` and `npm test`. New `lib/` functions get node tests.
- **Web at 390×844:** re-run the screenshot pass into `docs/screens/` and compare before and after, in both appearances.
- **Drags on web:** the scrubber, slider and dial work with a mouse.
- **Reduce Motion:** emulate `prefers-reduced-motion` on web and check that nothing loops and every line shows its end state.
- **Accessibility:** VoiceOver can operate the scrubber, slider and dial on the phone pass.
- **One phone pass at the end, covering:**
  - the `expo-blur` rebuild
  - 60 fps while scrubbing and turning the dial
  - haptics feel right
  - the recording screen stays still
