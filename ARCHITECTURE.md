# Apex — File Architecture

```
/
├── app.json · app.config.ts · eas.json      # Expo config; app.config.ts only swaps a local bundle id
├── AGENTS.md / CLAUDE.md                   # rules for coding agents (Expo docs, how we check)
│
├── app/                                    # expo-router screens
│   ├── _layout.tsx                         # providers, stack and screen titles
│   ├── (tabs)/                             # Home (feed + habit cards) · Log (record, rank) · Social
│   ├── trail/[id].tsx · trails.tsx         # trail page, catalog search
│   ├── flyover/[logId].tsx                 # 3D route flyover and video share
│   ├── post/[id].tsx                       # one hike with likes and comments
│   ├── friend/[id].tsx                     # a person, with their hikes when you're friends
│   ├── add-friends · friend-requests       # search, QR, invite links, requests
│   ├── group/[id] · create-group · join-group
│   ├── org/[id] · verify-org               # verified school or company boards
│   ├── notifications · report · blocked
│   ├── account · username · goal · rankings · credits · delete-account
│
├── components/                             # by area
│   ├── feed/ · social/ · groups/           # PostCard, SignInGate, TermsAgreement, WeekCard, Leaderboard…
│   ├── trail/ · ranking/ · score/ · log/   # trail detail, ranking sheet, score badge, recording UI
│   ├── flyover/ · opening/ · habit/        # flyover WebView, opening screen, streak/goal/pick
│   ├── safety/ · settings/ · craft/        # report and block, settings rows, polished cards
│   └── motion/                             # haptics, CountUp, GrowBar, Skeleton, ContourTexture…
│
├── hooks/                                  # TanStack Query data hooks (feed, friends, groups,
│                                           # organizations, notifications) and device hooks
├── lib/                                    # pure rules with node tests (*Rules.ts, ranking, streak,
│                                           # weekRecap, orgRules…), Supabase clients, remoteSync
├── stores/                                 # Zustand: trail cache, rankings, goal, settings
├── data/                                   # catalog trails, opening-screen places
├── tests/                                  # jest screen tests
│
├── supabase/
│   ├── migrations/                         # 001–023, run in order (see README)
│   ├── checks/                             # migration_status.sql, open_reports.sql
│   ├── seed/                               # test hikers, App Review account, catalog trails
│   └── functions/org-verify/               # emails school/work codes through Resend
│
├── site/                                   # Next.js landing page (Vercel), incl. /privacy /terms /support
└── docs/                                   # setup, security, releasing, specs and plans
```

## Data flow (ranking)

1. User finishes a live hike on `log` (`useTrailTracker.complete()`) or saves a past hike (`logPast`) → `hike_logs` (optimistic, offline). A past hike stores the chosen day, duration, and notes, then uses the same ranking path.
2. `PairwiseModal` opens with the new trail as challenger.
3. The user picks Loved, Fine, or Didn't like. `useTrailComparison` binary-searches that bucket's order, frozen at the start.
4. Undo walks a history stack. Too close inserts beside the current hike and stops. Nothing is written yet.
5. Place saves one ranking row (fractional `position`) and the session's `pairwise_comparisons`. The 0–10 score is derived from that position.

## Trail catalog

Two tiers, both `source = 'catalog'`:

- **Curated (23 trails):** hand-routed by `scripts/catalog/build.ts`, bundled in `data/catalogTrails.json` so they work offline. `state` is null.
- **Bulk (every named trail, by state):** `scripts/catalog/bulk_extract.py` reads one Geofabrik extract, turns named hiking routes, same-name footpaths and parks with unnamed paths into one line each, and adds elevation from the AWS Terrain Tiles open dataset. `bulk-all.sh` runs it state by state (one extract on disk at a time); `load_catalog.py` upserts the NDJSON into Supabase over a direct connection (`APEX_DB_URL`). `state` is the two-letter code.

The app never downloads the whole catalog. Migration 023 adds `search_catalog` (by name or town, nearest first), `catalog_near` (Finish suggestions) and `catalog_trails` (by id), all callable signed out. Fetched trails join the trail cache through `rememberTrails`. Sign-in sync pulls only `source = 'user'` trails, then fetches any catalog trail a hike or ranking points at.

## Location package pin

`expo-location` is pinned to exactly `57.0.24` (no `^` or `~`). `plugins/withRecordingNotification.js` patches that version's `LocationTaskService.kt` (`buildServiceNotification`, the `setContentIntent` block at lines 89–90) to add Pause and Finish. Prebuild throws if that file or needle is missing. Revisit the pin and the plugin needle on any `expo-location` upgrade.
