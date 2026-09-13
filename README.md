# Apex

**Personal trail ranking for people who hike like they ship.**

Apex is a utilitarian hiking log + ranking app — Beli-style pairwise comparisons with Strava-like telemetry, restrained like Linear. No feed. No purple gradients. Just trails, elevation, and an honest personal ranking.

Run the web preview locally to explore the UI (link below after `npm run web`).

---

## Why

Corporate hikers already track miles. What’s missing is a ranking system that doesn’t feel like a social network: finish a hike, compare it head-to-head against trails you’ve already done, and watch it slot into your personal top 10 via Elo + binary insertion.

## Features (v0)

| Area | Status |
|------|--------|
| Trail feed with personal ordinal ranks | Done |
| Trail detail — peak / gain / distance / avg moving | Done |
| Scrubbable elevation profile + light haptics | Done |
| Log hike (duration + notes) | Done |
| Pairwise ranking modal (swipe / tap) | Done |
| Binary-insertion + Elo (`useTrailComparison`) | Done |
| Animated personal top-10 reveal | Done |
| Offline mock data (Zustand + AsyncStorage) | Done |
| Supabase / PostGIS schema migration | Ready |
| Live GPS tracking | Planned |
| Photo attach on logs | Planned |
| Auth + cloud sync | Planned |

## Stack

- **App:** Expo SDK 57 · React Native · expo-router (file-based)
- **Style:** NativeWind v4 (Tailwind) · zinc monochrome + sage accent
- **Motion:** Reanimated · Gesture Handler · expo-haptics
- **Data:** TanStack Query · Zustand · AsyncStorage
- **Charts:** react-native-wagmi-charts
- **Backend (planned):** Supabase — PostgreSQL + PostGIS, Auth, Storage
- **Icons:** lucide-react-native (stroke ~1.6)

## Quick start

```bash
git clone <your-repo-url> apex
cd apex
npm install
npm run web          # http://127.0.0.1:43127
# or
npm run start        # Expo Go / simulators
```

| Script | What it does |
|--------|----------------|
| `npm run start` | Expo dev server (port **43127**) |
| `npm run web` | Web preview |
| `npm run ios` | iOS simulator |
| `npm run android` | Android emulator |

No backend required for the mock slice.

### Optional Supabase

```bash
cp .env.example .env
```

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

(Matches `lib/supabase.ts`. Without these, mock data is used.)

Apply the migration:

```bash
# In the Supabase SQL editor, or via CLI:
# supabase/migrations/001_initial_schema.sql
```

Until env vars are set, the app uses seeded Bay Area / Cascades / Yosemite trails and persists rankings locally.

## Project layout

```
app/                      # expo-router screens
  (tabs)/                 # Trails · Log · Rankings
  trail/[id].tsx          # Trail detail + elevation
components/
  trail/                  # TelemetryRow, ElevationSparkline, TrailCard
  ranking/                # PairwiseModal, LeaderboardReveal
hooks/                    # useTrailTracker, useRankings, useTrailComparison
stores/                   # Zustand trail cache + rankings
types/trail.ts            # Domain types
supabase/migrations/      # Postgres + PostGIS schema
ARCHITECTURE.md           # Fuller folder map + ranking data flow
.cursorrules              # Design + stack conventions for agents
```

## Ranking model

1. Finish a hike on **Log** → optimistic hike log write.
2. **PairwiseModal** opens with the new trail as challenger.
3. `useTrailComparison` binary-searches your sorted list (“which was better?”).
4. Each choice updates Elo (`lib/elo.ts`) in Zustand.
5. When bounds collapse → insertion index locks → haptic + top-10 reveal.

## Design notes

- Dark zinc foundation (`zinc-950` / `zinc-900`), 1px `zinc-800` borders
- Single accent: sage olive `#8B9A6D`
- Radii ≤ `rounded-xl`; no floaty shadows or card stacks in the hero list
- Mono labels for telemetry (`font-mono text-xs`)

## Contributing

This repo is early. Prefer small, typed PRs that keep screens thin and logic in hooks. Match `.cursorrules` for visual restraint.

## License

MIT — see [LICENSE](./LICENSE).
