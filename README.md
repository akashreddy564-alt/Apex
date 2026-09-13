# Apex

Utilitarian hiking log + trail ranking for outdoorsy tech people. Think Beli’s pairwise comparisons with Strava-style telemetry, restrained like Linear.

## Stack

- Expo SDK 57 · React Native · expo-router
- NativeWind v4 · Reanimated · Gesture Handler
- TanStack Query · Zustand (offline cache)
- Supabase schema ready (PostgreSQL + PostGIS)
- `react-native-wagmi-charts` elevation profiles
- `expo-haptics` · Lucide icons

## Run locally

```bash
npm install
npm run start          # Expo on port 43127
npm run web            # Web preview on port 43127
npm run ios            # iOS simulator
npm run android        # Android emulator
```

Optional Supabase:

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Without env vars the app uses local mock trails + Zustand persistence.

Apply the SQL migration in `supabase/migrations/001_initial_schema.sql` to your project when wiring a real backend.

## What’s in this slice

- Trail feed + detail with dense telemetry grid
- Scrubbable elevation sparkline (haptic on scrub)
- Log hike → pairwise ranking modal (swipe / tap)
- Binary-insertion + Elo via `useTrailComparison`
- Animated personal top-10 reveal

See `ARCHITECTURE.md` for the folder map.
