# Social setup (plan 3)

Each social step adds a migration. You run them in the Supabase SQL Editor, the same way as `007` (see `docs/supabase-grants.md` for the clicks).

| Step | Migration | Run after |
|------|-----------|-----------|
| 2. Accounts and profiles | `supabase/migrations/009_profiles.sql` | 008 |
| 3. Friends | `supabase/migrations/010_friends.sql` | 009 |
| 4. Feed, likes and comments | `supabase/migrations/011_feed.sql` | 010 |
| 5. Groups and leaderboards | `supabase/migrations/012_groups.sql` | 011 |
| 6. Notifications, report and block | `supabase/migrations/013_notifications_and_safety.sql` | 012 |
| Launch gaps: friends board, a friend's hikes | `supabase/migrations/016_friend_board_and_person_posts.sql` | 015 |
| Launch gaps: schools and companies | `supabase/migrations/017_organizations.sql` | 016 |
| Terms agreement | `supabase/migrations/018_terms.sql` | 017 |

Each is safe to run more than once. After running one, run `supabase/checks/migration_status.sql` and check that every row says `true`.

```bash
pbcopy < supabase/migrations/009_profiles.sql
```

## Sign-in emails

The app signs in with an email link. On a phone, the link opens Apex and signs you in. For safety, a link only works on the phone that asked for it (PKCE), so a link someone forwards you can't sign you into their account.

Done on 2026-10-25: `apex://**` is in **Authentication** → **URL Configuration** → **Redirect URLs**, so the link may open the app.

The app also takes a 6-digit code where the link can't open it (the simulator, or email read on a laptop). Supabase only lets you add `{{ .Token }}` to the email templates once custom SMTP is set up, so the code arrives after that step.

Supabase's built-in email only sends to your own team members, a few an hour. Before friends can sign in, set up a domain and a sender (Resend or Postmark) as custom SMTP, then add `Or enter this code in Apex: {{ .Token }}` to the **Magic link or OTP** and **Confirm sign up** templates.

## Test hikers

`supabase/seed/test_hikers.sql` adds three accounts nobody can sign in to (`maya_test`, `jordan_test`, `sam_test`). Maya sends a friend request to every real account, so you can try requests, accepting and unfriending with one phone. Run it again after a new person signs up to send them a request too. Once `011` has run, it also gives Maya and Jordan a few recent ranked hikes, so Home has posts after you accept Maya. Once `012` has run, it also makes a group, Test crew, that you join from Social with the code `TESTUP`. `supabase/seed/remove_test_hikers.sql` removes all three.

## Reports

Apple expects reports on user content to be acted on within 24 hours. Run `supabase/checks/open_reports.sql` in the SQL editor to see open ones with what was reported; the file's header has the one-line commands to remove a comment, post or account and to close the report. Until push notifications exist, nothing tells you a report came in, so check it daily once friends are testing.

## Schools and companies (017)

People join their school's or company's board by verifying an email there. The app asks the `org-verify` Edge Function to email a 6-digit code; only the domain is kept. It needs a sender, the same Resend account as sign-in:

1. Run `017_organizations.sql` (after `016`), then `supabase/checks/migration_status.sql`.
2. In Supabase → **Edge Functions → Secrets**, add `RESEND_API_KEY` and `ORG_EMAIL_FROM` (for example `Apex <verify@yourdomain.com>`, on a domain verified in Resend).
3. Deploy the function: `supabase functions deploy org-verify` (or paste `supabase/functions/org-verify/index.ts` into a new function named `org-verify` in the dashboard). Leave "Verify JWT" on.

Until step 2 is done the app says "Email verification isn't switched on yet." Personal mail (Gmail, iCloud, Outlook and the rest in `apex_private.personal_domains`) is refused. The first verified person from a domain names the board; anyone verified there later joins it. Verifications last a year, and each person can be on 3 boards. To rename an organization or merge two domains, edit `organizations` / `organization_domains` in the table editor.

The week share card uses `react-native-view-shot`, so rebuild the dev client once before trying it on a phone.

## Terms (018)

Apple asks apps where people post to have them agree to rules first (guideline 1.2). New accounts tick a box when they pick a username; accounts from before see a one-time "Agree and continue" card on Home and Social. After `018`, posting a hike or a comment without agreeing is refused. The rules live at `/terms` on the site (`site/app/terms`), next to `/privacy` and `/support`. The app links to them from `lib/legal.ts`; change `SITE_URL` there once the real domain exists.

## App Review demo account

Reviewers can't receive a sign-in email, so they sign in with a password from Settings → "Have a password? Sign in with it".

1. Run `supabase/seed/test_hikers.sql` (all of it) so there are posts and the Test crew group.
2. In **Authentication → Users → Add user**, create the reviewer with an email you control, a strong password and **Auto Confirm User** on.
3. Put that email on the first line of `supabase/seed/app_review.sql` and run it. It checks itself: one row with `friends = 2` and `in_group = true`.
4. Give the email and password to App Store Connect → **App Review Information**, with a note: "On the Log tab, tap the profile button, then Have a password? Sign in with it. Home shows friends' hikes; Social shows friends, a group and its leaderboard."

Supabase must allow email + password sign-in (**Authentication → Providers → Email**, on by default). Turning off "Allow new users to sign up" doesn't affect this account.
