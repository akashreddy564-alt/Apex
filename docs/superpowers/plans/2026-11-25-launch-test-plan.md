# Launch test plan (2026-11-25)

All launch code is on `main` as of `86ccf4a` (#69, #71, #73 merged this morning). Migrations `001`–`021` are applied to the Apex Supabase project. This plan is the one phone pass that every plan has been deferring, plus the checks before the first production build.

**Goal for today:** finish the phone pass, fix the P0s and P1s it turns up, and be ready for `npm run build:prod` on Thursday morning (Nov 26).

**Who does what:** the **owner** holds the phone. **Claude** runs the checks on the Mac, watches Metro and the database, logs bugs and fixes them on a branch (typecheck, tests, web at 390×844).

**How to rate a bug**

| Level | Meaning | When it gets fixed |
|---|---|---|
| **P0** | Crash, data loss, a stuck screen, a broken sign-in, or anything App Review would reject | Today, before the build |
| **P1** | A flow that works but is clearly wrong or confusing | Today if it takes under an hour, otherwise in a 1.0.1 |
| **P2** | Polish | After launch |

Log every bug in the table at the bottom: step, what happened, level, and a screenshot or screen recording.

---

## Phase 0: Mac checks (Claude, about 30 min, while the build runs)

Start Phase 1's build first, then do this while it runs. **The day-by-day walkthrough, including doing this from a cafe, is in [`2026-11-25-test-day-guide.md`](2026-11-25-test-day-guide.md).**

- [x] `npm run typecheck` and `npm test` on `main`: clean, 36/36 jest suites (166 tests). Run on #69 merged with the new `main`, the same tree that landed.
- [x] Migration `021` check is `true` (`001`–`020` were all `true` on 2026-11-24).
- [x] `open_reports` returns 0 rows. Reviewer exists with terms accepted. 5 profiles, 23 trails, 3 posts; `org-verify` is deployed.
- [x] A `production` config with an empty `EXPO_PUBLIC_MAPBOX_TOKEN` fails with "Production build is missing EXPO_PUBLIC_MAPBOX_TOKEN".
- [x] `app_review` had taken **First Ascent #002** (021 named the reviewer as `appreview@example.com`). Fixed by `022`, applied 2026-11-25: every `@hikeapex.com` address is skipped, the reviewer's number is cleared, and the counter is back at 1, so the next real hiker gets #002. Make any throwaway test account an `@hikeapex.com` address so it doesn't take a number.
- [ ] Web at 390×844 (`apex-web` preview) for the screens #69, #71 and #73 changed:
  - [ ] Scores show two decimals in Rankings, on trail cover cards and in the score badge, with nothing clipped.
  - [ ] The First Ascent badge on Settings/account, a friend's page, a person row and a post card.
  - [ ] The comparison loader's **Cancel** button.
  - [ ] Delete-account errors show inside the confirm sheet.
  - [ ] The location-denied screen on Log.
  - [ ] The support and terms links on the site (`/support`, `/terms`, `/privacy` on www.hikeapex.com).

## Phase 1: build the dev client (owner and Claude, about 20 min)

One rebuild covers every native change since the last dev client: `expo-notifications`, `expo-blur`, `react-native-view-shot`, `react-native-webview`, `expo-sharing` and the SDK patch updates.

- [ ] The phone is registered for internal builds (`eas device:create`, once).
- [ ] `eas build --profile development --platform ios`. It builds in the cloud, not on the Mac.
- [ ] Install it on the phone, start `apex-metro` on the Mac, and open the app over the same Wi-Fi.

## Phase 2: phone pass (owner, about 2–3 hours)

Work top to bottom, because later steps reuse data from earlier ones. Have Settings → Privacy → Location ready for step 2.10.

### 2.1 First launch and opening
- [ ] Delete the app and reinstall it for a true first launch.
- [ ] Launch-screen timing: no white flash, and the opening screen's cinematic photo appears without a jump.
- [ ] The "A in APEX becomes a peak" animation plays once and then settles.
- [ ] The photo credits link opens.

### 2.2 Sign in
- [ ] Magic link to the owner's email opens the app (`apex://` redirect).
- [ ] Code sign-in (the 6-digit `{{ .Token }}` from the email) works.
- [ ] **Password sign-in as the reviewer** (`review@hikeapex.com`). Follow the App Review note word for word: Log tab → profile button → "Have a password? Sign in with it".
- [ ] The terms card shows on first sign-in; the checkbox is required before posting or commenting.
- [ ] Username screen: a taken name, a too-short name, and emoji are refused clearly.
- [ ] Sign out and back in: nothing duplicates and nothing is lost.

> Without custom SMTP (Resend), only the owner's address gets sign-in mail. Any other tester has to use a password account.

### 2.3 Record a hike (go outside, about 15 min of walking)
- [ ] Slide to start. One haptic, and a second slide does not start a second hike.
- [ ] **Lock the screen for 5+ minutes while walking.** Unlock: the route has no gap and the distance and climb look right.
- [ ] The recording screen stays still (no looping motion).
- [ ] Finish → flyover plays at a smooth 60 fps → Skip mid-flight works → it hands off to ranking.
- [ ] Finish with **airplane mode on**: it skips the flyover and goes straight to ranking, and the hike syncs once you're back online.
- [ ] Finish → trail sheet: matching a catalog trail and naming a new one both work.

### 2.4 Ranking (#71 and #69)
- [ ] The comparison opens without hanging on "Preparing comparison". If it lingers, **Cancel** closes it, and it never stays past about 3 s.
- [ ] Answer a few comparisons, then undo one: it goes back to the right pair.
- [ ] Scores show two decimals everywhere, and no two trails in Rankings show the same score.
- [ ] Bands: Loved 7–10, Fine 4–6.99, Didn't like 0–3.99.

### 2.5 Past hike (#73)
- [ ] Log a past hike for **today**: it shows the trail's climb right away, not "0 ft climbed".
- [ ] Log one for an earlier day: it lands on that day and not on today.
- [ ] Past hikes don't move the friends board (only recorded hikes count).

### 2.6 Home and habit loops
- [ ] The streak and the goal ring update after the hike in 2.3.
- [ ] Goal dial: smooth turning, a haptic on each snap, and a page scroll that starts on the ring scrolls the page.
- [ ] Weekend pick shows Wed–Sun, "Not this one" moves on, and VoiceOver reads it as one button.
- [ ] The This-week row is correct.
- [ ] The notification permission prompt appears once, at a sensible moment.

### 2.7 Trail page and flyover
- [ ] Angels Landing scrubber: 60 fps and a haptic tick every 500 ft.
- [ ] Play flyover from the trail page.
- [ ] **Share video:** note the export time, save it to Photos, and play it in Instagram stories.
- [ ] Memory on a long route (20 km if you have one): no crash, and the phone stays cool.

### 2.8 Social (signed in as the owner, then the reviewer)
- [ ] The feed shows the test hikers' posts. Like and unlike, then comment and delete the comment.
- [ ] Your own hike from 2.3 posts with your own photo.
- [ ] Friends board: switch week, month and year.
- [ ] A friend's page lists their hikes and shows the First Ascent badge where they have one.
- [ ] Share the "Your week in hiking" card as an image to Messages and to Instagram.
- [ ] Add friends: search, invite link, and QR code (scan it from a second phone if you can).
- [ ] Friend requests: accept one and decline one.
- [ ] Groups: create one, join by code, invite, open the leaderboard, then leave. Remove a member if you are the owner.
- [ ] Notification bell: friend request, join, like, comment and "passed you" all arrive.
- [ ] Rankings, friends' trails and their scores are correct.

### 2.9 Safety (App Review checks these)
- [ ] Report a post, a comment and a person. Each one shows up in `open_reports.sql`; close them afterwards.
- [ ] Block a person: their posts and comments disappear, and they're listed under Settings → Blocked. Unblock.
- [ ] Without accepting the terms you can't post or comment.

### 2.10 Account and permissions (#73)
- [ ] Location **denied**: Log shows the location-denied screen with a working "Open Settings".
- [ ] Location "While Using" only: recording still works with the screen locked (or the app explains why it can't).
- [ ] **Delete account, on a throwaway account only (never the owner's or the reviewer's).** In airplane mode it says "Connect to the internet and try again" inside the sheet. Online, it deletes: the user is signed out, their posts are gone, and their storage files are removed (`020`).
- [ ] The Settings support and terms links open www.hikeapex.com.

### 2.11 Schools and companies (only once the Resend secrets are set)
- [ ] A personal Gmail is refused.
- [ ] A school or work email gets a 6-digit code, and verifying it joins or creates the board.
- [ ] Without Resend this answers "not switched on yet". That is expected; note it and move on.

### 2.12 Device details
- [ ] The tab bar's safe-area inset is right on this phone.
- [ ] Dark and light appearance both look right.
- [ ] Largest text size (Dynamic Type): nothing important is cut off.
- [ ] VoiceOver works the scrubber, the slider and the dial.
- [ ] Kill the app mid-recording, then reopen it: the hike is either recovered or clearly lost, never stuck.

## Phase 3: fix loop (Claude, rest of the day)

- Fix P0s first, each on its own branch with typecheck, tests and web at 390×844, then a PR.
- JS fixes reload over Metro on the dev client. No rebuild unless a native module changes.
- The owner rechecks each fixed step on the phone.

## Phase 4: production build smoke test (Thursday morning)

A release build behaves differently: no demo data, production env, no Metro.

- [ ] `npm run build:prod -- --platform ios`, the first ever. It asks for Apple sign-in and certificates.
- [ ] `npm run submit:ios` → TestFlight. Install it on the phone.
- [ ] Fresh install: no demo trails or rankings.
- [ ] Reviewer password sign-in works on the TestFlight build.
- [ ] Record one short hike, rank it, post it and check that it shows in the feed.
- [ ] Sign out and sign back in.
- [ ] `open_reports.sql` is at 0 again before you submit for review.

**Ready to submit when:** no open P0s, every Phase 2 box is ticked or noted as expected (for example 2.11 without Resend), and the TestFlight smoke test passes.

---

## Bug log

| # | Step | What happened | Level | Status |
|---|------|---------------|-------|--------|
| | | | | |
