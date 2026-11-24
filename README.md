# Apex

Record your hikes, rank them against each other, and climb with your friends.

Apex tracks a hike's route, distance and climb with the screen off and no signal, then asks a few this-or-that questions to slot it into your own ranking (no star ratings). After a hike it plays a 3D flyover of your route. With an account, friends see each other's ranked hikes, and groups, friends and verified schools or companies compete on weekly climbing boards.

## Status (2026-11-24)

Feature-complete for the iPhone launch; waiting on owner setup, one phone pass and App Store submission. The full picture, with what's left and in what order, is in **[the launch roadmap](docs/superpowers/plans/2026-11-24-launch-roadmap.md)**.

| Area | Status |
|------|--------|
| Recording (background GPS, climb, pause and finish) | Built, phone check owed |
| Trail catalog, freeform hikes, trail pages | Built |
| Ranking (bucket + binary insert, 0–10 score) | Built |
| Opening screen, visual pass, light and dark | Built |
| Accounts, profiles, terms agreement | Built (migrations up to `018`) |
| Friends, feed, likes, comments, friend pages with hikes | Built |
| Groups, friends leaderboard, verified school and company boards | Built |
| Notifications, report and block | Built |
| Habit loops: streak, weekly goal, weekend pick, week share card | Built |
| Route flyover and video share | Built, phone check owed |
| Landing site (`site/`) with privacy, terms and support | Live at https://apex-landing-kappa.vercel.app |
| App Store submission | Not started (needs Apple Developer) |

## Stack

- Expo SDK 57 · React Native · expo-router (typed routes)
- NativeWind v4 · Reanimated · Gesture Handler
- TanStack Query · Zustand
- Supabase: Postgres + PostGIS, Auth (magic link, code, password for App Review), Storage, one Edge Function (`org-verify`, email via Resend)
- Mapbox GL JS in a WebView for the flyover
- `site/`: a separate Next.js 16 landing page on Vercel

## Run

```bash
git clone https://github.com/akashreddy564-alt/Apex.git
cd Apex
npm install
npm run web      # http://127.0.0.1:43127
```

On a phone, build the dev client in the cloud (`npm run build:dev`) and run `npm start`. See `docs/RELEASING.md`.

### Supabase

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without these, Apex runs on this phone only: trails, logs and rankings stay local, and Home and Social ask for an account.

With them, run every file in `supabase/migrations/` (`001`–`018`) in the SQL editor, in order, then `supabase/checks/migration_status.sql`; every row should say `true`. `docs/social-setup.md` covers the social migrations, test hikers, the App Review account, sign-in emails and the `org-verify` function; `docs/security.md` lists the dashboard settings.

## Checks

```bash
npm run typecheck
npm test          # node tests for lib/, then jest for screens
```

UI changes are checked on web at 390×844; phones get one pass per plan (see "How we check" in the roadmap).

## Layout

```
app/                 # screens (expo-router): tabs, trail, friend, group, org, post, settings…
components/          # by area: feed, groups, social, trail, ranking, flyover, habit, motion…
hooks/               # data hooks (TanStack Query) and device hooks
lib/                 # pure rules (tested with node), Supabase clients, sync
stores/              # Zustand caches
supabase/            # migrations, checks, seeds, functions/org-verify
site/                # landing page (Next.js, deployed separately)
docs/                # setup, security, releasing, specs and plans
ARCHITECTURE.md      # a closer map and the ranking flow
```

## Ranking

After you finish a hike you pick a bucket (Loved, Fine, or Didn't like). Apex binary-searches that bucket's frozen order and writes one fractional position when you tap Place. The 0–10 score is the hike's place inside the bucket band (`lib/ranking.ts`). Comparisons are saved only then.

## License

MIT. See [LICENSE](./LICENSE).
