# Plan 3, step 1: three tabs and the new look

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape Apex into Home, Social and Log tabs, with Bone as the one signature color, dark/light appearance, and a per-user score style, before any social code lands.

**Architecture:** One semantic palette per appearance lives in `theme/tokens.ts`. JS reads it through `useColors()`; NativeWind classes read the same values through CSS variables set on the root view with `vars()`. A persisted Zustand settings store holds `appearance` and `scoreStyle`. Scores render through one `ScoreBadge` component.

**Tech Stack:** Expo SDK 57, expo-router tabs, NativeWind 4.2 (`vars`), Zustand `persist` + AsyncStorage, react-native-svg, node:test for pure logic, jest-expo + react-test-renderer for components.

**Spec:** `docs/superpowers/specs/2026-10-23-apex-social-and-app-structure-design.md` (parent: `docs/superpowers/specs/2026-10-16-apex-launch-design.md`).

## Plan 3 overview

The design ships as six steps, each with its own detailed plan written when its turn comes, against the code as it is then. Each lands as its own PR from main.

| Step | What | Needs |
|------|------|-------|
| **1** | **Three tabs, Bone, dark/light, score styles (this plan)** | none |
| 2 | Accounts: email magic link sign-in gate for Home and Social, profiles with unique usernames, first-sign-in upload that doesn't post | 1 |
| 3 | Friends: requests, username search, `apex://` invite link and code, QR, unfriend, block | 2 |
| 4 | Feed: posts on ranking, trimmed routes and friend photo access, likes, comments, save trail, full hike view, Log Hikes in post style | 3 |
| 5 | Groups: create, join by link or code, remove, leave, group week in the group's time zone, together number, four stat cards, leaderboard, recorded gain column with the 1.5× cap | 3 (4 for stat cards) |
| 6 | In-app notification bell, report and block menus, account deletion check against new tables | 4, 5 |

Later, outside plan 3: verified company and school groups; Sign in with Apple, push notifications and universal links with the Apple Developer account; a domain and Resend before anyone else signs in.

## Global Constraints

- Read the Expo SDK 57 docs at https://docs.expo.dev/versions/v57.0.0/ before writing code (`AGENTS.md`).
- Signature color Bone: `#EDE6D6`. It is the only accent. No sage, no orange `#FF8A4C` anywhere after this plan.
- Dark is the default appearance. The opening screen is always dark, whatever the setting.
- Score styles: `number` (default), `peak`, `blaze`. Bucket short labels: `Loved`, `Fine`, `Nope`.
- A bucket with fewer than 3 hikes shows its bucket name, never a number (existing rule in `placementScoreLabel`).
- No emoji as icons. Icons stay `lucide-react-native`.
- Minimum type size stays 11 pt (`minTypeSize`).
- Recording, ranking and logging keep working signed out and offline.
- Branch per task group off main, PR with a merge commit, `npm test` and `npm run typecheck` green before each PR.

## Review Focus

1. **Appearance switched while a sheet or modal is open** (record session, past-hike sheet, pairwise modal): every visible surface repaints at once, with no restart. Test in Task 2.
2. **Light mode on maps:** the route line must stay visible on light map tiles and on the recorded-route figure, so the light accent is dark ink, not Bone. Test in Task 1.
3. **Persisted settings missing, from an older build, or corrupt:** the app falls back to `dark` and `number` and doesn't crash. Test in Task 1.
4. **Old links to the removed Rankings and Trails tabs** (`/rankings`, `/(tabs)/rankings`, the bare `/` that used to be Trails): they land on Log's Rankings view or Home, not a 404. Test in Task 4.
5. **Peak and blaze with a 1–2 hike bucket:** the badge shows the bucket word and still fits the shape. Test in Task 3.

---

### Task 1: Palettes, contrast and the settings store

**Files:**
- Modify: `theme/tokens.ts`
- Create: `lib/contrast.ts`, `lib/contrast.test.ts`
- Create: `lib/appearance.ts`, `lib/appearance.test.ts`
- Create: `stores/settingsStore.ts`
- Modify: `package.json` (add both new `.test.ts` files to the `test` script's node list)

**Interfaces:**
- Produces:
  - `type Appearance = 'dark' | 'light'`
  - `type ScoreStyle = 'number' | 'peak' | 'blaze'`
  - `interface Palette { bg; surface; raised; border; borderStrong; fg; fg2; fgMuted; fgFaint; accent; onAccent; loved; fine; disliked; mapLine }` (all `string` hex)
  - `palettes: Record<Appearance, Palette>` in `theme/tokens.ts`
  - `contrastRatio(a: string, b: string): number` (WCAG relative luminance) in `lib/contrast.ts`
  - `parseSettings(raw: unknown): { appearance: Appearance; scoreStyle: ScoreStyle }` in `lib/appearance.ts`
  - `useSettings`: a Zustand store with `appearance`, `scoreStyle`, `setAppearance(a)`, `setScoreStyle(s)`, persisted under `apex-settings`, whose `merge` runs `parseSettings`

Values:
- Dark: keep today's zinc values for `bg`…`fgFaint`; `accent '#EDE6D6'`, `onAccent '#0B0B0C'`, `loved '#4CC27A'`, `fine '#E0B04A'`, `disliked '#E2675A'`, `mapLine '#EDE6D6'`.
- Light: `bg '#FFFFFF'`, `surface '#F6F6F4'`, `raised '#ECECEA'`, `border '#D9D9D6'`, `borderStrong '#BDBDB8'`, `fg '#141414'`, `fg2 '#2E2E30'`, `fgMuted '#5F5F63'`, `fgFaint '#8A8A90'`, `accent '#2A2620'`, `onAccent '#EDE6D6'`, `loved '#1F8F4E'`, `fine '#A86F0C'`, `disliked '#C2412F'`, `mapLine '#2A2620'`.
- In light mode the accent is Bone's dark ink with Bone text on it, because Bone on white disappears. This is a builder's call; note it in the PR.

- [ ] **Step 1: Write the failing tests**

`lib/contrast.test.ts`:
```ts
it('measures black on white as 21', () => assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF')), 21));
for (const name of ['dark', 'light'] as const) {
  const p = palettes[name];
  it(`${name}: body text reads (≥ 7)`, () => assert.ok(contrastRatio(p.fg, p.bg) >= 7));
  it(`${name}: muted text reads (≥ 4.5)`, () => assert.ok(contrastRatio(p.fgMuted, p.bg) >= 4.5));
  it(`${name}: accent button label reads (≥ 4.5)`, () => assert.ok(contrastRatio(p.onAccent, p.accent) >= 4.5));
  it(`${name}: route line shows on the map surface (≥ 3)`, () => assert.ok(contrastRatio(p.mapLine, p.surface) >= 3));
  it(`${name}: every score color reads on bg (≥ 3)`, () => {
    for (const c of [p.loved, p.fine, p.disliked]) assert.ok(contrastRatio(c, p.bg) >= 3);
  });
}
```
`lib/appearance.test.ts`:
```ts
it('defaults to dark and number', () => assert.deepEqual(parseSettings(undefined), { appearance: 'dark', scoreStyle: 'number' }));
it('keeps valid values', () => assert.deepEqual(parseSettings({ appearance: 'light', scoreStyle: 'blaze' }), { appearance: 'light', scoreStyle: 'blaze' }));
it('drops unknown values field by field', () => assert.deepEqual(parseSettings({ appearance: 'system', scoreStyle: 'peak' }), { appearance: 'dark', scoreStyle: 'peak' }));
it('survives garbage', () => assert.deepEqual(parseSettings('{oops'), { appearance: 'dark', scoreStyle: 'number' }));
```

- [ ] **Step 2: Run `npm test` and confirm both files fail** (missing modules).
- [ ] **Step 3: Implement `palettes`, `contrastRatio`, `parseSettings` and `useSettings`.** Keep exporting `colors` as `palettes.dark` for now, so untouched screens still compile until Task 6 removes it. If a light value misses a threshold, adjust the light value, not the test.
- [ ] **Step 4: Run `npm test`.** Expected: all node and jest tests pass.
- [ ] **Step 5: Commit** "Add dark and light palettes, contrast checks, and the settings store."

### Task 2: Theme plumbing

**Files:**
- Create: `hooks/useColors.ts`
- Modify: `theme/tokens.ts` (add `cssVars`), `tailwind.config.js`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app.json` (`userInterfaceStyle: "automatic"`)
- Test: `lib/appearance.test.ts` (add), `tests/theme-switch.test.tsx` (new)

**Interfaces:**
- Consumes: `palettes`, `useSettings` (Task 1)
- Produces:
  - `useColors(): Palette`, reading `useSettings((s) => s.appearance)`
  - `cssVars(p: Palette): Record<\`--color-${string}\`, string>`, mapping each key to space-separated RGB channels (for example `'--color-bg': '9 9 11'`)
  - Tailwind semantic color names `bg`, `surface`, `raised`, `border`, `border-strong`, `fg`, `fg-2`, `fg-muted`, `fg-faint`, `accent`, `on-accent`, `loved`, `fine`, `disliked`, each `rgb(var(--color-x) / <alpha-value>)`. The old `accent` sage scale and `sage` keys are removed from `tailwind.config.js`.

- [ ] **Step 1: Write failing tests.**
  - `cssVars(palettes.dark)['--color-bg'] === '9 9 11'`, and `cssVars(palettes.light)['--color-accent'] === '42 38 32'`.
  - `tests/theme-switch.test.tsx`: render a probe component that shows `useColors().bg` inside a sheet-like child. Call `useSettings.getState().setAppearance('light')` inside `act`, and assert the probe now shows `#FFFFFF` without remounting.
- [ ] **Step 2: Run them; expect failures.**
- [ ] **Step 3: Implement.**
  - In `app/_layout.tsx`, wrap everything under `GestureHandlerRootView` in `<View style={[{ flex: 1 }, vars(cssVars(palette))]}>`.
  - Set `StatusBar` style from appearance, and call `Appearance.setColorScheme(appearance)` in an effect so native pickers and keyboards match.
  - Stack and tab `screenOptions` read `useColors()`.
  - The tab bar's active tint is `fg`, inactive `fgFaint`.
  - `OpeningScreen` keeps `palettes.dark` explicitly.
- [ ] **Step 4: Run `npm test` and `npm run typecheck`.** Expected: green.
- [ ] **Step 5: Commit** "Drive colors from the appearance setting."

### Task 3: ScoreBadge

**Files:**
- Create: `lib/scoreBadge.ts`, `lib/scoreBadge.test.ts`, `components/score/ScoreBadge.tsx`, `tests/score-badge.test.tsx`
- Modify: `package.json` (add `lib/scoreBadge.test.ts` to the node list)

**Interfaces:**
- Consumes: `Bucket`, `formatRankScore` (`lib/ranking.ts`), `useSettings`, `useColors`
- Produces:
  - `scoreBadgeContent(bucket: Bucket, count: number, score: number): { value: string | null; label: 'Loved' | 'Fine' | 'Nope'; tone: Bucket }`
  - `<ScoreBadge bucket count score size?: 'lg' | 'sm' />`. `lg` is for posts and the trail page, `sm` for list rows. The `style` comes from `useSettings`, overridable with a `style` prop so Settings can preview each one.

Shapes:
- **number:** value in Inter 800, `lg` 26 pt and `sm` 17 pt, in the tone color; the label in 9.5 pt caps under it (`lg` only).
- **peak:** the SVG path `M2 38 L17 10 L23 18 L30 4 L44 38 Z` on a 46×40 viewBox, filled with the tone color; the value in `onAccent` dark ink, bottom-centered.
- **blaze:** a 30×44 rectangle with 3 px radius, rotated −2°, filled with the tone color, the value centered.
- When `value` is null, the label shows in its place. In peak and blaze the font shrinks to fit (11 pt minimum).

- [ ] **Step 1: Write failing tests.**
  - `scoreBadgeContent('disliked', 5, 3.14)` → `{ value: '3.1', label: 'Nope', tone: 'disliked' }`
  - `scoreBadgeContent('loved', 2, 9.6)` → `{ value: null, label: 'Loved', tone: 'loved' }`
  - `scoreBadgeContent('fine', 3, 6)` → `value: '6.0'`
  - The jest test renders each `style` with `count: 1`. It asserts the text `Loved` is present and that no text matches `/\d/`.
- [ ] **Step 2: Run; expect failures.**
- [ ] **Step 3: Implement both.**
- [ ] **Step 4: Run `npm test`; green.**
- [ ] **Step 5: Commit** "Add the score badge with number, peak and blaze styles."

### Task 4: Home, Social and Log tabs

**Files:**
- Modify: `app/(tabs)/_layout.tsx` (tabs: `index` titled Home, `social`, `log`, with lucide icons `House`, `Users`, `Footprints`; the Settings header button is removed)
- Rewrite: `app/(tabs)/index.tsx` (Home)
- Create: `app/(tabs)/social.tsx`, `app/trails.tsx` (today's Trails list, moved as is)
- Delete: `app/(tabs)/rankings.tsx`
- Create: `components/ranking/RankingsList.tsx` (the body of the old rankings screen, rows use `ScoreBadge size="sm"`)
- Create: `components/log/LogHeader.tsx`
- Modify: `app/(tabs)/log.tsx`
- Create: `app/rankings.tsx` (a redirect)
- Modify: `app/_layout.tsx` (register `trails`)
- Test: `tests/rankings-list.test.tsx`, `tests/old-routes.test.tsx`

**Interfaces:**
- Consumes: `ScoreBadge` (Task 3), `useColors` (Task 2), `useRankings` (existing)
- Produces:
  - `<RankingsList onOpenTrail(id: string) />`
  - `<LogHeader view: 'hikes' | 'rankings' onView(v) onStart() onLogPast() />`
  - Log route param `view=rankings` opens the Rankings view.

Screens:
- **Home** for now:
  - A header with the `apex` wordmark (Bricolage 800, 22 pt).
  - An empty state: "Your friends' hikes will show up here." with a secondary line "Friends arrive in the next update."
  - A "Browse trails" row that pushes `/trails`.
  - Step 2 replaces the empty state with the sign-in gate.
- **Social:** a "Social" title (`displayXL`) and "Add friends and start groups here soon." (step 3 fills it).
- **Log, top to bottom:**
  - A "Log" title with an avatar circle on the right that pushes `/account`.
  - A row with **Start a hike** (accent fill, `onAccent` text, a filled dot icon) and **Log past hike** (surface fill).
  - A two-way switch, **Hikes** and **Rankings**.
  - **Hikes** shows today's choose-trail flow and log history unchanged; step 4 restyles it.
  - **Rankings** shows `RankingsList`.
- `app/rankings.tsx` does `<Redirect href="/log?view=rankings" />`.

- [ ] **Step 1: Write failing tests.**
  - `rankings-list.test.tsx`: seed `useRankingStore` with 3 loved and 1 fine. Assert the section headers `Loved` and `Fine`, three numeric badges in Loved, and the word `Fine` (not a number) in the one-hike Fine row.
  - `old-routes.test.tsx`: render `app/rankings.tsx` and assert it renders a `Redirect` to `/log?view=rankings`.
- [ ] **Step 2: Run; expect failures.**
- [ ] **Step 3: Implement the screens and routes.** `recordingLink` and the notification deep links still target `/log` (check `lib/recordingLink.ts`).
- [ ] **Step 4: Run `npm test`, `npm run typecheck`, then `npm run web`.**
  - Click through Home → Browse trails → a trail.
  - Log → Rankings, then Log → Start a hike.
  - Open `/rankings` and confirm it lands on Log's Rankings.
- [ ] **Step 5: Commit** "Reorganize the app into Home, Social and Log tabs."

### Task 5: Appearance and score style in Settings

**Files:**
- Modify: `app/account.tsx` (both the local-mode and signed-in branches get an "Appearance" and a "Score style" section above the account section)
- Create: `components/settings/ChoiceRow.tsx`
- Test: `tests/settings-choices.test.tsx`

**Interfaces:**
- Consumes: `useSettings`, `ScoreBadge`
- Produces: `<ChoiceRow<T extends string> options: { value: T; label: string; preview?: ReactNode }[] value: T onChange(v: T) />`, a segmented row with `accessibilityRole="radio"` and `accessibilityState.checked`

Content:
- **Appearance:** Dark, Light.
- **Score style:** Number, Peak, Blaze, each with a live `ScoreBadge` preview of `loved / 9.4` (count 5).
- Section labels use sentence case.

- [ ] **Step 1: Write a failing test.** Render `AccountScreen` with Supabase unconfigured. Press the radio labeled `Light` and expect `useSettings.getState().appearance === 'light'`. Press `Blaze` and expect `scoreStyle === 'blaze'`.
- [ ] **Step 2: Run; expect failure.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run `npm test`; green.**
- [ ] **Step 5: Commit** "Let people pick appearance and score style in Settings."

### Task 6: Move every screen onto the theme and retire sage and orange

**Files:**
- Modify: every file under `app/` and `components/` that imports `colors` from `@/theme/tokens` or uses `zinc-*`, `accent` or `sage` classes. Today that's 21 files with `colors.` and 18 with zinc classes; find them with the grep in Step 1.
- Modify: `theme/tokens.ts` (remove the `colors` export, the sage keys, `heroAccent` and `elevationGradient`'s sage stops; the elevation gradient becomes `[fgFaint, fg2, accent]` from the palette)
- Modify: `components/opening/OpeningScreen.tsx` (rules and accents use `palettes.dark.accent`, Bone)
- Modify: `components/trail/TrailCoverCard.tsx` (the top-item highlight is `accent`, not orange)

Class mapping (copy exactly):

| From | To |
|------|----|
| `zinc-950` | `bg` |
| `zinc-900` | `surface` |
| `zinc-800` | `raised` |
| `zinc-700` | `border` |
| `zinc-600`, `zinc-500` | `fg-faint` |
| `zinc-400` | `fg-muted` |
| `zinc-300`, `zinc-200` | `fg-2` |
| `zinc-100`, `zinc-50` | `fg` |
| `accent` (sage), `accent-faint` | `accent`, `accent/15` |

In JS styles, `colors.x` becomes `c.x` from `const c = useColors()`. `colors.sage` becomes `c.accent` and `colors.onSage` becomes `c.onAccent`. `StyleSheet.create` blocks holding colors move the color keys inline, or into a `useMemo` keyed on the palette.

- [ ] **Step 1: Record the starting count.**
  Run: `grep -rlE "bg-zinc|text-zinc|border-zinc|bg-accent|text-accent|border-accent|colors\.|heroAccent|sage" app components hooks | wc -l`
- [ ] **Step 2: Convert, in two commits:**
  - (a) `app/` and `components/trail`, `components/opening`, `components/ranking`
  - (b) `components/log`, `components/settings`, `components/score`
- [ ] **Step 3: Remove `colors`, sage and `heroAccent` from `theme/tokens.ts`.** Run `npm run typecheck`, which now flags anything missed. Fix it.
- [ ] **Step 4: Verify.**
  - The Step 1 grep returns `0`.
  - `grep -rn "FF8A4C\|8B9A6D" app components theme tailwind.config.js` returns nothing.
  - `npm test` is green.
  - On `npm run web` at 390×844, screenshot Home, Log (both views), a trail page, Settings, and the record and past-hike sheets, in Dark and in Light. Switch appearance with the past-hike sheet open; it repaints.
  - The opening screen stays dark in Light.
- [ ] **Step 5: Commit** "Move every screen onto the theme and retire sage and orange."

### Task 7: iPhone check and PR

- [ ] **Step 1:** Run `npx expo run:ios` with the local bundle id from `.env` on the simulator (or the owner's phone). Check:
  - the tab bar;
  - Light and Dark on Log, the trail page and the pairwise modal;
  - the opening screen;
  - peak and blaze in Rankings.
- [ ] **Step 2:** Open the PR "Plan 3 step 1: three tabs, Bone, appearance and score styles". In the body:
  - list the light-accent call (dark ink with Bone text);
  - attach the Dark and Light screenshots;
  - note that Home and Social are placeholders until steps 2 and 3.
