# Social setup (plan 3)

Each social step adds a migration. You run them in the Supabase SQL Editor, the same way as `007` (see `docs/supabase-grants.md` for the clicks).

| Step | Migration | Run after |
|------|-----------|-----------|
| 2. Accounts and profiles | `supabase/migrations/009_profiles.sql` | 008 |
| 3. Friends | `supabase/migrations/010_friends.sql` | 009 |

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

`supabase/seed/test_hikers.sql` adds three accounts nobody can sign in to (`maya_test`, `jordan_test`, `sam_test`). Maya sends a friend request to every real account, so you can try requests, accepting and unfriending with one phone. Run it again after a new person signs up to send them a request too. `supabase/seed/remove_test_hikers.sql` removes all three.
