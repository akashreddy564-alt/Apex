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

The app signs in with an email link. On a phone, the link opens Apex and signs you in. For safety, a link only works on the phone that asked for it (PKCE), so a link someone forwards you can't sign you into their account. Where the link can't open the app (the iOS simulator, or reading the email on a laptop), the app also takes the 6-digit code from the same email, **if the email template includes it**:

1. Supabase dashboard → **Authentication** → **Emails** → **Magic Link** (and **Confirm signup**).
2. Add a line such as `Or enter this code in Apex: {{ .Token }}`.
3. Under **Authentication** → **URL Configuration**, add `apex://**` to **Redirect URLs**, so the link may open the app.

Supabase's built-in email only sends to your own team members, a few an hour. Before friends can sign in, set up a domain and a sender (Resend or Postmark) as custom SMTP. Building and testing don't need it.
