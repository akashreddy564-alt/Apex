# Security

Audit and health check, 2026-11-21, on `feat/hardening` (stacked on `feat/habit-loops`). Re-run the checks at the bottom before each release.

## Owner actions (dashboard, not code)

1. **Run `014_rate_limits_and_input_checks.sql`** after `011`–`013`. Then run `supabase/checks/migration_status.sql`; row 20 should be `true`.
2. **Run `015_safety_fixes.sql`** after `014`. Row 21 of the status check should be `true`. It stops anyone checking who blocked whom, makes reports point only at the reported person's own post or comment, and caps every recorded hike on group boards by its recorded length.
3. **Auth email rate limit.** Supabase → Authentication → Rate Limits: emails sent per hour. The built-in sender allows only a few; once Resend or Postmark is set up as custom SMTP, keep it at about 30 per hour. The app also holds "Send link" for 60 s.
4. **Restrict the Mapbox public token** to the bundle id `com.apex.trails` (Mapbox → Tokens → URL / app restrictions). It ships inside the app by design, so a restriction is what stops reuse.
5. **Redirect URLs.** Supabase → Authentication → URL Configuration: allow only `apex://**` (and the dev web URL while testing). Remove wildcards like `*`.
6. **Leaked password protection / CAPTCHA** aren't needed while sign-in is magic link only. Turn CAPTCHA on if sign-up spam shows up.

## What was checked

| Area | Result |
|---|---|
| Secrets in the repo and its full git history | None. Mapbox and Supabase values live in the gitignored `.env`; `.env.example` lists every variable with placeholders. |
| Secret vs public keys | The app only gets the Supabase publishable key and the Mapbox `pk.` token. The Mapbox `sk.` download token has no `EXPO_PUBLIC_` prefix, so it never reaches the bundle. No service-role key anywhere. |
| Row level security | On for all 14 tables. Views use `security_invoker`, so RLS still applies through them. |
| `security definer` functions | All 40+ pin `search_path`. None are granted to `anon`. |
| Friend-only data | Routes come trimmed 300 m at each end from `trim_route()`; raw `recorded_path` stays owner-only. Photos stay in a private bucket (5 MB, jpeg/png/webp) with 1-hour signed URLs, issued only after a friendship check. |
| Profiles | Hold username and display name only. No email or other contact data is readable by others. |
| Sign-in links | PKCE: a link only works on the phone that asked for it. Links carrying bare tokens are ignored, so nobody can sign you into their account. |
| Rate limiting | Migration 014, per person over 15 minutes: friend requests, reports, new groups and join-code tries 5; likes 60; comments 20; blocks 20; posts 30; username changes 5. Wrong join codes count, so 6-character codes can't be guessed. Reads and hike sync aren't limited. Tune in `apex_private.rate_limits`. |
| Input | Every typed field is cleaned in the app (`lib/sanitize.ts`: NFC, no control or bidi-override characters, trimmed, cut to the limit) and checked again in the database (length and control-character constraints, 009–014). Text is always rendered as text, never HTML. The search box escapes LIKE wildcards. |
| Moderation | Report and block on profiles, posts and comments (Apple UGC rule). Reports readable only via `supabase/checks/open_reports.sql`. In-app account deletion. |
| Offline cache | The query cache persists to AsyncStorage so screens open instantly. It holds what you could already see (your feed, friends, groups), is wiped from memory and disk on sign-out, and expires after 7 days. |
| Logging | No `console.log` of tokens, sessions or user data in app code. |
| Dependencies | `npm audit fix` took 19 advisories (1 critical) to 7. Five are build-time only (Expo CLI, Metro, config plugins). Two touch runtime: `d3-color` (ReDoS on color strings; Apex passes only its own colors) and `decode-uri-component` via expo-router's deep-link parsing (DoS on a crafted link). Both clear with the Expo SDK 58 upgrade; do that before App Store submission. |

## Known gaps

- **Photo uploads aren't rate-limited** beyond the bucket's size and type rules. Storage policies can't count; if abuse appears, move uploads behind an Edge Function.
- **Backdated past hikes** still count toward the streak's week (see `docs/habit-hooks.md`).
- **Group members' names** are visible to everyone in a group, by design. Hikes, routes, photos and scores are not.

## Re-running the checks

```bash
npm run typecheck && npm test
git log --all -p | grep -nE "sk\.eyJ|pk\.eyJ|sb_secret|service_role.*eyJ"   # expect nothing
npm audit --omit=dev
```
In the Supabase SQL editor: `supabase/checks/migration_status.sql`.
