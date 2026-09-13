# Apex

Hiking log and personal trail ranking.

Log trails you’ve done, record basic telemetry (distance, elevation, duration), add photos later, and rank them against each other with simple pairwise comparisons. Inspired by apps like Beli (comparisons) and Strava (activity stats)—built as a focused mobile app, not a social feed.

## Status

Early prototype. Mock trail data runs locally without a backend.

| Feature | Status |
|---------|--------|
| Trail list + detail | Done |
| Elevation profile (scrubbable) | Done |
| Log a hike | Done |
| Pairwise ranking + Elo | Done |
| Personal top ranking list | Done |
| Supabase / PostGIS schema | Ready (not wired) |
| Live GPS tracking | Planned |
| Photos on logs | Planned |
| Auth + sync | Planned |

## Stack

- Expo (SDK 57) · React Native · expo-router
- NativeWind v4 · Reanimated · Gesture Handler
- TanStack Query · Zustand
- react-native-wagmi-charts · expo-haptics · lucide-react-native
- Supabase schema prepared for PostgreSQL + PostGIS

## Run

```bash
git clone https://github.com/akashreddy564-alt/Apex.git
cd Apex
npm install
npm run web      # http://127.0.0.1:43127
# or: npm start / npm run ios / npm run android
```

Dev server uses port **43127**.

### Optional Supabase

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without env vars, seeded trails and local rankings are used. SQL lives in `supabase/migrations/001_initial_schema.sql`.

## Layout

```
app/                 # screens (expo-router)
components/trail/    # detail UI, elevation chart
components/ranking/  # pairwise modal, leaderboard
hooks/               # tracking, rankings, comparisons
stores/              # local cache
types/               # shared types
supabase/migrations/ # DB schema
ARCHITECTURE.md      # folder map + ranking flow
```

## Ranking

After you finish logging a hike, Apex asks which trail was better—new one vs one you already ranked. It binary-searches your list and updates Elo scores (`hooks/useTrailComparison.ts`, `lib/elo.ts`), then shows where the trail landed in your ranking.

## License

MIT — [LICENSE](./LICENSE).
