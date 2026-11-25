# Apex launch roadmap (2026-11-24)

**Replaces the status sections of** `2026-10-16-launch-roadmap.md` and the unmerged `2026-11-23-launch-roadmap-update.md` (branch `claude/roadmap-update-1fa555`). The 2026-10-16 file's plans and "How we check" rules still apply.
**Specs:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md` (launch) and `docs/superpowers/specs/2026-10-23-apex-social-and-app-structure-design.md` (social).

## Status, 2026-11-25 night

Submission target: build Thursday morning, Nov 26; launch Fri Nov 27 (fallback Mon Nov 30).

- **Site:** #70 merged (the screens ring stops on each screen and brings it forward). Vercel `apex-landing` is now Git-connected: Root Directory `site`, production branch `main`, so every merge to `main` deploys on its own. The domain is live: **https://www.hikeapex.com** is primary and `hikeapex.com` 308-redirects to it. `apex-landing-kappa.vercel.app` still works.
- **Email:** Cloudflare Email Routing forwards `support@hikeapex.com` and `review@hikeapex.com` to the owner.
- **Database:** `migration_status.sql` on the Apex project shows `001`–`020` applied (rows 24–26 true). 3 test hikers, 23 trails, 0 open reports.
- **Reviewer account: done.** `review@hikeapex.com` exists in Supabase Auth and `app_review.sql` has run with it: `app_review` profile, terms accepted, 2 friends, 1 pending request, in Test crew. Not yet tried in the app. Put the email and password in App Review Information.
- **Redirect URL:** `apex://**` added in Supabase Auth.
- **EAS env:** the 3 `EXPO_PUBLIC_` keys are set in production and preview and match `.env`, so `eas env:set` isn't needed.
- **Mapbox:** the app uses the Default public token, which can't take URL restrictions. A URL restriction would also 403 the Static Images cover photos, since native requests send no Referer. It stays unrestricted for launch; don't refresh it. See `docs/security.md`.
- **Code fixes:** PR #71 (launch blockers) is open; the P1 fixes follow on `fix/launch-p1s`.
- **Left:** merge the fix PRs, then `eas build -p ios --profile production` (cloud build, the first ever, so it asks for Apple sign-in and certificates) and `eas submit`. The App Store Connect app for `com.apex.trails` must exist first.

## What changed since 2026-11-23

- **#57 (merged):**
  - Friends leaderboard (`016` `friend_board`).
  - A friend's page lists their hikes (`016` `person_posts`).
  - "Your week in hiking" share card.
  - Verified school and company boards: `017`, the `org-verify` Edge Function, and the `verify-org` and `org/[id]` screens.
  - Security fixes before merge: codes come from pgcrypto's CSPRNG, expired verifications lose board access, and members read only their own row.
- **#58 (merged):**
  - Terms agreement (`018`; posts and comments need it).
  - App Review password sign-in plus `supabase/seed/app_review.sql`.
  - `/privacy`, `/terms` and `/support` pages on the site.
  - iPhone only, with `ITSAppUsesNonExemptEncryption: false`.
- **#55 and #56 (merged):** the landing site dropped the trail marquee and the pinned hike, and scrolls faster. It's live at https://apex-landing-kappa.vercel.app.

**Checks on `f9f1a9e`:** typecheck is clean. `npm test` passes: 342 node tests and 30/30 jest suites (150 tests). Migrations `016`–`018` are **applied** to the Apex project (2026-11-24), `migration_status.sql` shows all 24 rows true, the test hikers are seeded (3 posts, Test crew) and `org-verify` is deployed. No phone pass yet.

## Roadmap at a glance

| # | Plan | Status | Left |
|---|------|--------|------|
| 0 | Launch foundation | Done, except Apple Developer | Apple Developer enrollment (owner). GPS with the screen locked (phone pass) |
| 1 | Opening screen | Done, phone check owed | Launch-screen timing on the phone |
| 2 | Trail catalog and freeform hikes | Done, phone check owed | Finish → trail sheet on the phone |
| 3 | Accounts, friends, feed, groups, safety | **Built, including the friends board and friends' hikes.** Phone check owed | Custom SMTP so others can sign in (owner). Run `016` and `018` |
| 3b | Schools and companies | **Built** | Add the Resend secrets (owner) |
| 3c | Terms and App Review access | **Done** (reviewer created and seeded 2026-11-25) | Credentials into App Review Information (owner) |
| 4 | Habit loops, plus the week share card | Built, phone check owed | Phone pass (dev client rebuild: `expo-notifications`, `react-native-view-shot`) |
| 5 | Route flyover and video share | Built, phone check owed | 60 fps, export and memory checks. Token stays unrestricted for launch (see `docs/security.md`) |
| 6a | Visual pass | Done in code | Look at the signed-in social screens in the phone pass |
| 6b | App Store submission | **In progress** | Fix PRs (#71 and P1s), then the first production build and submit |
| — | Landing site | **Done, live at www.hikeapex.com**, auto-deploys from `main` | `SUPPORT_EMAIL` and hikeapex.com links (#71). App Store link on "Download now" |

## The three features the owner asked about

- **Social feed:** built and merged. The "Your week in hiking" card, the one gap from the social spec, is now built too (Social tab, shared as an image).
- **Friends:** adding, requests, QR and invite links, groups, a friends-only leaderboard (week, month and year on Social) and a friend's page with their hikes are all built. The remaining gap is invite links that work without the app installed, which needs universal links, a domain and Apple Developer.
- **Joining a school or company:**
  - Built. Verify a school or work email with a 6-digit code; Apex keeps only the domain.
  - Personal mail is refused. The first person from a domain names the board and later people join it.
  - Verification lasts a year, with a renewal nudge. Up to 3 boards per person.
  - It needs `017`, the Resend secrets and the `org-verify` function deployed before it works.

## Before submission

### Blocking

Owner actions are marked **(owner)**.

1. **Apple Developer enrollment (owner).** It can take days, so start it first.
2. **Domain and Resend (owner).** Custom SMTP for sign-in (add `{{ .Token }}` to the templates), plus `RESEND_API_KEY` and `ORG_EMAIL_FROM` for `org-verify`. Until then, only the owner can sign in.
3. **Database: done 2026-11-24.** `016`–`018` applied (24/24 checks true), test hikers seeded, `org-verify` deployed. It answers "not switched on yet" until the Resend secrets in step 2 exist.
4. **Reviewer account: done 2026-11-25** (`review@hikeapex.com`, seeded). Still to do: add the credentials and the note from `docs/social-setup.md` to App Review Information. (Original step: create it with a password in Supabase Auth, put its email in `app_review.sql` and run it. Add the credentials and the note from `docs/social-setup.md` to App Review Information.)
5. **Support contact: inbox and domain done 2026-11-25; code in #71.** Set `SUPPORT_EMAIL` in `site/lib/contact.ts`. When the domain exists, point `SITE_URL` in `lib/legal.ts` at it and deploy the site there.
6. **Phone pass**, with the dev client rebuilt once. It covers:
   - GPS with the screen locked, launch timing, and Finish → trail sheet.
   - Magic link, code and password sign-in.
   - Invite links and QR codes.
   - Feed, friends board, friend page, week card share, and school verification end to end.
   - Flyover: 60 fps, export and memory.
   - The terms card and checkbox.
7. **Mapbox token, bundle id `com.apex.trails`, and EAS production env vars: done 2026-11-25** (env vars set; token left unrestricted on purpose). See `docs/RELEASING.md` and `docs/security.md`.
8. **Listing (owner):** paste from `docs/app-store-listing.md` (name, subtitle, description, keywords, privacy labels, age-rating answers, review notes), and add 6.9" iPhone screenshots. The privacy manifest (required-reason APIs from every native dependency) is already in `app.json`.
9. **TestFlight**, with friends testing on their own phones, **then submit.** Run `npm run build:prod` and `npm run submit:ios`, and add `ascAppId` to `eas.json`.
10. **Link the site:** point the three "Download now" buttons at the App Store URL.

### After launch

- Push notifications. The in-app bell already works.
- **Last signed in (owner asked, 2026-11-25).** When someone who already has an account comes back to sign in, the sign-in screen remembers them on this device: "Welcome back, Maya", the email they last used filled in (shown partly hidden, `m•••@gmail.com`), and a "Last used" tag on whichever sign-in method they used once Sign in with Apple exists. Small, and it saves returning hikers from guessing which email or method they signed up with. Confirm the exact behaviour with the owner before building.
- Universal links and a hosted invite page.
- Sign in with Apple.
- Weekend pick using friends' rankings.
- Android, after iPhone. Google's 14-day closed test needs 12 testers, so it can start early.
- Admin tools for organizations: rename or merge domains. Today this is done in the table editor.
- Housekeeping, done 2026-11-24: merged branches deleted locally and on GitHub. Branches with commits not in `main` are kept as tags (`archive/lab/scroll-options`, `archive/claude/roadmap-update-1fa555` and four old `archive/cursor/*` branches); restore one with `git switch -c <name> archive/<name>`.

## Suggested order

1. **Today (owner):** Apple Developer enrollment, a domain, and Resend.
2. **Owner, in one sitting in Supabase:**
   - Migrations `016`–`018` and the status check.
   - `test_hikers.sql`, then the reviewer user and `app_review.sql`.
   - Resend secrets and the `org-verify` deploy.
3. **Owner dashboards:** Mapbox token, bundle id, EAS env vars.
4. **One phone pass** on a rebuilt dev client. Fix what it finds with typecheck, tests and web at 390×844.
5. **TestFlight**, then the listing and submit, then link the site.

## How we check

Unchanged: typecheck and tests on every change, web at 390×844 for UI, no phone check per step or PR, and one phone pass per plan. Build in the cloud with EAS.
