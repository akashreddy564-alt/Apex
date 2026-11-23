# Apex launch roadmap: status update (2026-11-23)

**Replaces the status columns of:** `docs/superpowers/plans/2026-10-16-launch-roadmap.md`. That file is left as it was. Its plan sections and "How we check" rules still apply.
**Specs:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md` (launch) and `docs/superpowers/specs/2026-10-23-apex-social-and-app-structure-design.md` (social; it wins where the two disagree).

## How this was checked

Each status below comes from the code on `main` at `94850d4` (2026-11-23), the git history and the migrations in `supabase/migrations/`, not just from what earlier docs say.

- **Merged:** every feature branch named in the old roadmap is in `main`: `feat/feed` (#37), `feat/groups` (#38), `feat/safety` (#40), `feat/habit-loops`, `feat/hardening`, `feat/craft-pass`, `feat/weekend-pick`, `fix/migration-015`, `fix/demo-seed`, `chore/expo-install-fix`, `feat/flyover` and `feat/visual-pass` (#49). `git branch --no-merged main` shows only `lab/scroll-options` (a site spike), `test-all` and `tmp/native-check2` (old scratch branches).
- **Since the old roadmap's last update (2026-11-21):** #50 `feat/topo-color` (topo map colors, a new difficulty rating, and **light is now the default** with dark in Settings, which reverses the social spec's "dark by default"), and #51–#55 for the landing site.
- **Database:** migrations `001`–`015` are in the repo. The 2026-11-21 status note says `011`–`015` were run on the Apex Supabase project and `supabase/checks/migration_status.sql` returned all 21 rows `true`. That was the owner's report; this update didn't query the live database again.
- **Checks on `94850d4`:** `npm run typecheck` passes. `npm test` passes all node `lib/` tests. `npx jest --ci -w 2` passes 28 of 28 suites (137 tests). One earlier full run on a busy Mac (392 s, default workers) had 7 suites fail while loading `react-native-reanimated`'s mock, with no test assertion failing. Those suites pass when rerun, so this looks like load, not a bug. If CI ever shows it, cap jest's workers.
- **Not checked on a phone.** No phone pass has run since plan 3 started (see "How we check" in the old roadmap).

Status words: **Done** means merged and working in typecheck, tests and web. It may still owe its phone check. **Built, phone check owed** means the same, with real-device items still open. **In progress** means part of it is built. **Not started** means no code exists.

## Roadmap at a glance

| # | Plan | Status | Evidence | Left |
|---|------|--------|----------|------|
| 0 | Launch foundation | **Done, except Apple Developer** | Units (#24); Supabase grants `007`; EAS project linked (`app.json` `extra.eas.projectId`, `eas.json` with development, preview, production and simulator profiles); `expo install --fix` (`c846322`) | Apple Developer enrollment. Real-device GPS with the screen locked (phone pass) |
| 1 | Opening screen | **Done, phone check owed** | #23; `components/opening/OpeningScreen.tsx`, `data/heroPlaces.ts`, credits in `docs/hero-credits.md` and `app/credits.tsx` | Launch-screen timing on the phone. Owner review of places and facts (launch spec) |
| 2 | Trail catalog and freeform hikes | **Done, phone check owed** | #31; `008_trail_catalog.sql`, `data/catalogTrails.json`, `lib/trailMatch.ts`, `lib/userTrail.ts`, `components/log/TrailAssignSheet.tsx` | Finish → trail sheet on the phone |
| 3 | Accounts, friends, feed, groups, leaderboards, safety | **Built, phone check owed.** Two gaps (below) | #32–#40; migrations `009`–`015`; screens listed in the next section | Phone pass. Sign-in for anyone but the owner needs custom SMTP (owner). No friends-only leaderboard. No terms (EULA) screen for user content |
| 4 | Habit loops | **Built, phone check owed** | `lib/streak.ts`, `lib/weeklyGoal.ts`, `app/goal.tsx`, `lib/weekendPick.ts`, `components/habit/*`, on-phone reminders in `lib/nudges.ts` and `lib/nudgeScheduler.ts` (`docs/habit-hooks.md`) | Phone pass (needs the dev client rebuilt for `expo-notifications`) |
| 5 | Route flyover and video share | **Built, phone check owed** | `9f1b7fc`; `app/flyover/[logId].tsx`, `components/flyover/FlyoverView.tsx`, `lib/flyover/plan.ts`; spec `2026-11-21-route-flyover-design.md` | Owner adds `https://flyover.apex.app/` to the Mapbox token's allowed URLs, or the flyover skips itself. 60 fps, export and memory checks on the phone |
| 6a | Visual pass | **Done in code** | Craft pass, `83f3112`, then #50 (topo colors, difficulty on trail cards and in `components/craft/DifficultyCard.tsx`, light default) | Look check of the signed-in social screens in the phone pass |
| 6b | App Store submission | **Not started** | No App Store Connect app, no `ascAppId` in `eas.json`, no TestFlight build | Everything under "Before App Store submission" |
| — | Landing site (`site/`, live at https://apex-landing-kappa.vercel.app) | **Done, link missing** | #51–#55: Next.js 16 page with record, flyover, rank and friends sections | The "Download now" buttons in `site/components/landing/hero.tsx`, `nav.tsx` and `closing.tsx` have no link. Point them at the App Store listing once it exists. The site has no privacy policy or support page yet, and App Store Connect needs both URLs |
| — | Company and school groups | **Not started** | No code, table or migration (see below) | Planned as "Later" in the social spec |

## The three features the owner asked about

### 1. Social feed

**Status: built and merged. Phone check owed.**

- **Database:** `011_feed.sql` adds `posts`, `post_likes` and `post_comments`, with RLS so only friends see posts (`posts_select_friends`, `can_see_post`). `feed_posts` returns the feed. `trim_route()` removes the first and last 300 m of every route a friend sees. Friends read your photos through the `hike_photos_friends_select` storage policy (`photo_owner_is_friend`). The bucket stays private.
- **When a hike posts:** ranking a hike upserts a post (`lib/remoteSync.ts:520–543`, called from `hooks/useTrailComparison.ts:275`). `lib/postRules.ts` `shouldPost` skips hikes older than 7 days, so a backlog never floods friends' feeds.
- **Screens:** Home (`app/(tabs)/index.tsx`) shows streak, goal ring and weekend pick above the feed, plus the notification bell with an unread count. Each post is a `components/feed/PostCard.tsx` with a swipeable route and photo strip (`PostMedia.tsx`). Tapping one opens `app/post/[id].tsx`, with the full hike, likes and comments.
- **Comparison tags:** "Ranked above your Mount Si" (`lib/postRules.ts` `comparisonTag`, tested in `postRules.test.ts`).
- **Safety:** report and block on posts and comments (`components/safety/useSafetyMenu.ts`, `app/report.tsx`). `015_safety_fixes.sql` limits reports to content you can see.
- **Rate limits and input checks:** `014_rate_limits_and_input_checks.sql` (posts, likes, comments).
- **Not built:** the shareable "Your week in hiking" card from the social spec's Profile section. No code mentions it.

### 2. Friends (adding, requests, leaderboards, groups)

**Status: adding, requests and groups are built and merged. A friends-only leaderboard was planned and never built. Phone check owed.**

- **Database:** `009_profiles.sql` (`profiles`, unique usernames) and `010_friends.sql` (`friendships`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `my_friendships`, `are_friends`, `friend_count`). Friendships are mutual: one person asks, the other accepts.
- **Adding friends:** `app/add-friends.tsx` searches by username prefix (`lib/friends.ts` `searchPeople`), shows a QR code (`components/social/QrCode.tsx`) and shares an invite link. The link uses the app's own scheme (`apex://friend/<id>`, `friendInvitePath`). It can't open without the app installed. Universal links wait on Apple Developer and a domain.
- **Requests:** a bar on Social ("Maya wants to be friends"), plus `app/friend-requests.tsx`, plus a bell notification (`013`, `friend_request` and `friend_accepted`).
- **Friend page:** `app/friend/[id].tsx` shows name, username, friend count, a friend or request button, and Report or block. It does **not** list that friend's hikes. Their hikes appear only in the Home feed.
- **Groups:** `012_groups.sql` (`groups`, `group_members`, `create_group`, `join_group`, `leave_group`, `remove_group_member`, `group_board`, `group_summary`, `group_places`). Screens: `app/create-group.tsx` (name plus color or icon, `components/groups/GroupMark.tsx`), `app/join-group.tsx` (6-character code, or an `apex://join-group?code=…` link that fills it in and joins), and `app/group/[id].tsx` (week, month and year switch, the "together" total, four stat cards — top climber, group favorite, taste match, longest day — the board, invite, leave, and owner remove by long press). Social's `components/groups/GroupsSection.tsx` shows your place in each group this week and whether you moved. Groups cap at 50. A test group, Test crew, joins with code `TESTUP` from `supabase/seed/test_hikers.sql`.
- **Leaderboards:** group boards only. The old roadmap and launch spec both promised "group **and friend** leaderboards" of elevation gain. No friend board exists: there's no RPC, view or screen that ranks just your friends. `useRankings.ts`'s `leaderboard` is your own trail ranking, not a people board. The workaround today is to create a group with your friends. Board gain counts recorded hikes only, capped at 1.5× the catalog trail's gain and by recorded length (`015` `board_gain`).
- **"Passed you":** `013` adds a `passed` notification, one per group per week.
- **Blocks:** `013` `blocks`, `block_user` and `unblock_user`; `app/blocked.tsx` in Settings.

### 3. Joining a school or company

**Status: not started. There's no code for it at all.**

- The social spec (`2026-10-23-apex-social-and-app-structure-design.md`) put it under **Non-goals for this plan** and **Later**: verify a work or school email with a 6-digit code, store only the domain, auto-join the organization's group, and show a ✓ on its board. It needs personal-domain blocking, a domain-to-organization map and re-verification.
- `docs/superpowers/plans/2026-10-23-social-step-1-app-shell.md:26` lists it as "Later, outside plan 3".
- A search of `app/`, `components/`, `lib/`, `hooks/`, `stores/`, `types/` and `supabase/` finds no organization, school, company or domain-verification table, column, function or screen. The only mention is the empty-state copy in `components/groups/GroupsSection.tsx:63`: "Start one with your coworkers or hiking crew".
- **What works today:** a coworker or classmate group is an ordinary group joined by code or link. Nothing checks that members really work or study there, which is the owner's stated worry ("one fake member at the top ruins a company leaderboard").
- **To build it:** a new migration (for example `016_organizations.sql`: `organizations`, `organization_domains`, `organization_members` with a verified date, plus grants and RLS as in `007`), a verify-email screen reached from Profile, a server function that sends and checks the code (it needs the same custom SMTP as sign-in), a list of blocked personal domains, and an organization board that reuses `group_board`'s math. Treat it as a post-launch plan. It doesn't block the App Store.

## Before App Store submission

### Blocking

Owner actions are marked **(owner)**. The rest is builder work.

1. **Apple Developer enrollment (owner).** Blocks TestFlight, App Store Connect and review. Enrollment can take days, so start it first.
2. **A domain and a real email sender (owner).** Supabase's built-in email only reaches project team members. Set up Resend or Postmark as custom SMTP, then add `{{ .Token }}` to the Magic link and Confirm sign up templates (`docs/social-setup.md`). Until then, no tester or reviewer can sign in, and Home and Social stay behind the sign-in gate.
3. **How App Review signs in.** Sign-in is email magic link or 6-digit code only. Reviewers can't read a code sent to an inbox they don't own, so they need a demo account path. Decide this (for example a reviewer account whose code the owner reads out in the review notes, or a review-only login), and seed that account with friends, posts and a group so the social features can be reviewed.
4. **Terms for user content (builder).** Apple's guideline 1.2 asks apps with user content to have users agree to terms that forbid objectionable content, as well as to offer report and block (built) and act on reports within 24 hours (`supabase/checks/open_reports.sql`, run daily by the owner). The app has no terms screen or agreement step. Add a short agreement at sign-up and host the terms on the site.
5. **Privacy policy and support URLs (builder, on `site/`).** App Store Connect requires a privacy policy URL. Add `/privacy` and `/support` pages to the site.
6. **The phone pass.** Everything owed in the old roadmap's "How we check": GPS with the screen locked, launch-screen timing, Finish → trail sheet, magic link and invite links and QR on a phone, the feed with test hikers, the flyover checks (60 fps, Skip, export, airplane mode, memory on 20 km), the craft-pass list, and a look at the signed-in social screens. Rebuild the dev client once (`expo-notifications`, `expo-blur`, `react-native-webview`).
7. **Mapbox token (owner).** Allow `https://flyover.apex.app/` and restrict the token to the bundle id (`docs/security.md`, step 4).
8. **Bundle id (owner).** `com.apex.trails` is still called a placeholder in `docs/RELEASING.md`. Confirm it before the first upload, since changing it later means a new listing.
9. **Production env vars on EAS (owner).** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and the Mapbox token for the `production` environment (`docs/RELEASING.md`). Without them a store build falls back to local mock trails.
10. **Listing (owner, with builder help).** iPhone screenshots. `app.json` has `"supportsTablet": true`, so App Store Connect will also ask for iPad screenshots: either set it to `false` or capture iPad screens. Privacy labels for location, photos, email and user content. An age rating that reflects user content. Review notes explaining that location runs in the background only while a hike is recording (`isIosBackgroundLocationEnabled` is on, with Always strings in `app.json`).
11. **TestFlight, then submit.** `npm run build:prod` and `npm run submit:ios`. Add `ascAppId` to `eas.json` once the app exists in App Store Connect.
12. **Landing site Download link.** Point the three "Download now" buttons at the App Store URL once the listing exists.

### Nice to have (can follow launch)

- **A friends-only leaderboard**, as the old roadmap promised. A small RPC over `friendships` that reuses `board_gain`, plus a card on Social.
- **Friend page lists their hikes** (`app/friend/[id].tsx`).
- **"Your week in hiking" share card** (social spec, Profile).
- **Push notifications.** The in-app bell works now. Push needs Apple Developer and a token table.
- **Universal links and a hosted invite page**, so invite links work for people without the app.
- **Sign in with Apple.** Not required while email is the only sign-in method.
- **Company and school groups with verification** (section 3 above).
- **Weekend pick with friends' rankings** (option B in `2026-11-21-weekend-pick-design.md`).
- **`ITSAppUsesNonExemptEncryption: false`** in `app.json` `ios.infoPlist`, so each upload skips the export-compliance question.
- **Android.** After the iPhone launch. Google's 14-day closed test with 12 testers can start early.
- **Housekeeping:** delete the merged feature branches and `test-all` and `tmp/native-check2`. Bring the old roadmap's "Current spot" paragraph up to date, or point it at this file.

## Suggested order

1. **Today (owner):** start Apple Developer enrollment, and buy the domain and set up Resend (items 1–2). Both take calendar time, so start them before anything else.
2. **Builder, in parallel:** the terms agreement in the app, plus `/privacy`, `/support` and `/terms` on the site (items 4–5). Decide the reviewer sign-in and seed a reviewer account (item 3). Set `supportsTablet` and the encryption key (items 10 and nice-to-have).
3. **Owner dashboard steps:** Mapbox token, bundle id, EAS production env vars (items 7–9).
4. **One phone pass** with a rebuilt dev client (item 6). Fix what it finds, with typecheck, tests and web at 390×844 per change, and no second phone pass unless a native module changes.
5. **Production build to TestFlight**, then a few friends test on their own phones (they can sign in once item 2 is done).
6. **Listing and submit** (items 10–11), then **link the site** (item 12).
7. **After launch:** friends leaderboard, push, universal links, then company and school groups.

## How we check

Unchanged from the old roadmap and `AGENTS.md`: typecheck and tests on every change, web at 390×844 for UI, no phone check per step or PR, and one phone pass per plan. Build in the cloud with EAS, not on the Mac.
