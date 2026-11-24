# Apex launch roadmap (2026-11-24)

**Replaces the status sections of** `2026-10-16-launch-roadmap.md` and the unmerged `2026-11-23-launch-roadmap-update.md` (branch `claude/roadmap-update-1fa555`). The 2026-10-16 file's plans and "How we check" rules still apply.
**Specs:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md` (launch) and `docs/superpowers/specs/2026-10-23-apex-social-and-app-structure-design.md` (social).

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

**Checks on `f9f1a9e`:** typecheck is clean. `npm test` passes: 342 node tests and 30/30 jest suites (150 tests). Migrations `016`–`018` were run against the Apex project as the test hikers inside rolled-back transactions; they are **not applied**. No phone pass yet.

## Roadmap at a glance

| # | Plan | Status | Left |
|---|------|--------|------|
| 0 | Launch foundation | Done, except Apple Developer | Apple Developer enrollment (owner). GPS with the screen locked (phone pass) |
| 1 | Opening screen | Done, phone check owed | Launch-screen timing on the phone |
| 2 | Trail catalog and freeform hikes | Done, phone check owed | Finish → trail sheet on the phone |
| 3 | Accounts, friends, feed, groups, safety | **Built, including the friends board and friends' hikes.** Phone check owed | Custom SMTP so others can sign in (owner). Run `016` and `018` |
| 3b | Schools and companies | **Built** | Run `017`, add the Resend secrets, deploy `org-verify` (owner) |
| 3c | Terms and App Review access | **Built** | Run `018`, create the reviewer, run `test_hikers.sql` then `app_review.sql` (owner) |
| 4 | Habit loops, plus the week share card | Built, phone check owed | Phone pass (dev client rebuild: `expo-notifications`, `react-native-view-shot`) |
| 5 | Route flyover and video share | Built, phone check owed | Allow `https://flyover.apex.app/` on the Mapbox token (owner). 60 fps, export and memory checks |
| 6a | Visual pass | Done in code | Look at the signed-in social screens in the phone pass |
| 6b | App Store submission | **Not started** | Everything under "Before submission" |
| — | Landing site | **Done, with legal pages** | `SUPPORT_EMAIL` (`site/lib/contact.ts`) once an inbox exists. App Store link on "Download now" |

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
3. **Database (owner).**
   - Run `016`, `017` and `018`, then `supabase/checks/migration_status.sql` (rows 22–24 should be true).
   - Run all of `supabase/seed/test_hikers.sql`; the live database has no Test crew or test posts yet.
   - Deploy `org-verify` (`docs/social-setup.md`).
4. **Reviewer account (owner).** Create it with a password in Supabase Auth, put its email in `app_review.sql` and run it. Add the credentials and the note from `docs/social-setup.md` to App Review Information.
5. **Support contact (owner, then builder).** Set `SUPPORT_EMAIL` in `site/lib/contact.ts`. When the domain exists, point `SITE_URL` in `lib/legal.ts` at it and deploy the site there.
6. **Phone pass**, with the dev client rebuilt once. It covers:
   - GPS with the screen locked, launch timing, and Finish → trail sheet.
   - Magic link, code and password sign-in.
   - Invite links and QR codes.
   - Feed, friends board, friend page, week card share, and school verification end to end.
   - Flyover: 60 fps, export and memory.
   - The terms card and checkbox.
7. **Mapbox token, bundle id `com.apex.trails`, and EAS production env vars (owner).** See `docs/RELEASING.md` and `docs/security.md`.
8. **Listing (owner, with builder help):** iPhone screenshots, privacy labels (location, photos, email, user content), an age rating for user content, and a review note about background location while recording.
9. **TestFlight**, with friends testing on their own phones, **then submit.** Run `npm run build:prod` and `npm run submit:ios`, and add `ascAppId` to `eas.json`.
10. **Link the site:** point the three "Download now" buttons at the App Store URL.

### After launch

- Push notifications. The in-app bell already works.
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
