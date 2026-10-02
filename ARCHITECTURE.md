# Apex — File Architecture

```
/
├── .cursorrules
├── app.json
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── global.css
├── nativewind-env.d.ts
├── package.json
├── README.md
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # trails, hike_logs, trail_rankings, pairwise
│
├── types/
│   └── trail.ts                        # Trail, HikeLog, TrailRanking, ComparisonRound…
│
├── lib/
│   ├── elo.ts                          # Elo update + expected score
│   ├── format.ts                       # duration / elevation / distance formatters
│   └── supabase.ts                     # client (env + local mock fallback)
│
├── data/
│   └── mockTrails.ts                   # seeded Bay Area / Cascades trails + profiles
│
├── stores/
│   ├── trailCache.ts                   # Zustand offline trail + log cache
│   └── rankingStore.ts                 # personal Elo / ordinal rankings
│
├── hooks/
│   ├── useTrailTracker.ts              # active hike session (duration, notes, photos)
│   ├── useRankings.ts                  # ranked list + optimistic mutations
│   └── useTrailComparison.ts           # binary-insertion pairwise + Elo
│
├── components/
│   ├── trail/
│   │   ├── ElevationSparkline.tsx      # wagmi LineChart, scrub + moving stroke
│   │   ├── CountUpText.tsx             # interval count-up for telemetry
│   │   ├── TelemetryRow.tsx            # dense mono telemetry grid
│   │   └── TrailCard.tsx               # list row (no card chrome bloat)
│   └── ranking/
│       ├── PairwiseModal.tsx           # swipeable “which was better?”
│       └── LeaderboardReveal.tsx       # animated top-10 slot-in
│
└── app/                                # expo-router
    ├── _layout.tsx                     # providers (Query, Gesture, dark theme)
    ├── +html.tsx
    ├── +not-found.tsx
    ├── (tabs)/
    │   ├── _layout.tsx                 # Home / Log / Rankings
    │   ├── index.tsx                   # trail feed
    │   ├── log.tsx                     # finish hike → triggers ranking modal
    │   └── rankings.tsx                # personal top trails
    └── trail/
        └── [id].tsx                    # Trail Detail + elevation profile
```

## Data flow (ranking)

1. User finishes a hike on `log` → `useTrailTracker.complete()` writes `hike_logs` (optimistic).
2. `PairwiseModal` opens with the new trail as challenger.
3. `useTrailComparison` binary-searches the opponent list frozen at session start.
4. Choices only move the search bounds. Elo (`lib/elo.ts`) and the ordinal slot are written once, when `low > high`. The slot is the midpoint of the frozen neighbors, so it matches the trails the user compared.
5. `LeaderboardReveal` shows that ordinal, then a haptic.
