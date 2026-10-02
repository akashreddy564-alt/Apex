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
│       ├── 001_initial_schema.sql      # trails, hike_logs, trail_rankings, pairwise
│       ├── 002_hike_photos_storage.sql # private hike-photos bucket
│       └── 003_geojson_views.sql       # trails_api / hike_logs_api
│
├── types/
│   └── trail.ts                        # Trail, HikeLog, TrailRanking, ComparisonRound…
│
├── lib/
│   ├── elo.ts                          # Elo update + expected score
│   ├── format.ts                       # duration / elevation / distance formatters
│   ├── geo.ts                          # uuid, EWKT, haversine
│   ├── hikePhotos.ts                   # stripped JPEG file URI or hike-photos bucket ref
│   ├── locationTask.ts                 # native background location task
│   ├── photoEncode.ts                  # re-encode via ImageManipulator, reject EXIF
│   ├── remoteSync.ts                   # optional Supabase pull / push
│   └── supabase.ts                     # client (env + local mock fallback)
│
├── data/
│   └── mockTrails.ts                   # seeded Bay Area / Cascades trails + profiles
│
├── stores/
│   ├── trailCache.ts                   # Zustand offline trail + log cache
│   ├── rankingStore.ts                 # personal Elo / ordinal rankings
│   └── comparisonStore.ts              # pairwise comparison history
│
├── hooks/
│   ├── useTrailTracker.ts              # active hike session (duration, notes, photos)
│   ├── useHikePhotos.ts                # library / camera → log photo refs
│   ├── useAuth.ts                      # magic-link session
│   ├── useRemoteSync.ts                # hydrate caches when signed in
│   ├── useLiveLocation.ts              # foreground watch or background task
│   ├── useRankings.ts                  # ranked list + optimistic mutations
│   └── useTrailComparison.ts           # binary-insertion pairwise + Elo
│
├── components/
│   ├── trail/
│   │   ├── ElevationSparkline.tsx      # wagmi LineChart, scrub + moving stroke
│   │   ├── CountUpText.tsx             # UI-thread count-up for telemetry
│   │   ├── TelemetryRow.tsx            # dense mono telemetry grid
│   │   ├── TrailCard.tsx               # list row (no card chrome bloat)
│   │   ├── PhotoStrip.tsx              # hike photo thumbnails
│   │   └── TrailMap.tsx                # canonical + recorded polyline
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
3. `useTrailComparison` binary-searches the sorted ranking list via pairwise choices.
4. Each choice updates Elo (`lib/elo.ts`) optimistically in Zustand + React Query.
5. When `low > high`, insertion index is final → `LeaderboardReveal` + haptic.
