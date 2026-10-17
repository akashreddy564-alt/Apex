# Trail catalog and freeform hikes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hikers can record or log any hike: if it starts near a known trailhead the app suggests that trail, otherwise the hiker names it and it becomes their own trail. A modest catalog of popular US trails ships with the app.

**Architecture:** A build-time pipeline turns Geofabrik state extracts into small committed route files, adds USGS elevation from Open Topo Data, and writes a bundled catalog (`data/catalogTrails.json`) plus a Supabase seed file. The app matches a recording's first fix against catalog trailheads on the device (works signed-out and offline). User trails are ordinary `trails` rows with an `owner_id`, created locally and synced like logs.

**Tech Stack:** Expo SDK 57, Zustand, Supabase (PostGIS), node `--experimental-strip-types` tests, jest-expo, pyosmium (pipeline only, never shipped).

**Spec:** `docs/superpowers/specs/2026-10-16-apex-launch-design.md` ("Where people can hike", Constraints) and roadmap section 2 in `docs/superpowers/plans/2026-10-16-launch-roadmap.md`.

## Global Constraints

- No public OpenStreetMap tile servers and no public Overpass. Show "© OpenStreetMap" wherever OSM data appears.
- Elevation comes from USGS via Open Topo Data (`ned10m` dataset).
- Schema changes go in a new migration numbered 008 or higher, idempotent, with explicit grants to `authenticated` and RLS on new tables. Never edit 001–007.
- Data stays metric; display miles and feet through `lib/format.ts`.
- Never put a Pressable's layout in a function style; layout goes on an inner View.
- Anton poster text needs `posterLineStyle` (only on the #28 branch), so new UI here does not use Anton.
- `lib/*.ts` used by node tests must not import `@/` paths.
- Never commit app.json bundle id changes.

## Decisions (builder's calls, owner can push back)

1. **Source:** Geofabrik per-state `.osm.pbf` extracts, downloaded one at a time into a temp folder and deleted after use. Only the resulting route lines (with their OSM way ids) are committed in `scripts/catalog/routes/`. That folder is our hosted extract. The app never calls OSM.
2. **Routing, not name matching:** each curated trail lists a trailhead, the points it passes through, and preferred trail names. The pipeline finds the shortest foot route through those points on the OSM path network, preferring the named trails. This copes with hikes that use several named trails.
3. **First set:** about 25 popular trails in 5 states: California (Bay Area, Yosemite), Washington, Colorado, Utah, New Hampshire. Adding a state is one command.
4. **Shapes:** out-and-back trails store the one-way line; distance and the elevation profile cover the round trip.
5. **Matching on the device:** a recording whose first fix is within 500 m of a trailhead gets that trail suggested, ranked by distance and by how much of the recording runs along the trail. Own trails match too, so repeat freeform hikes group together.
6. **Freeform default:** "Record" starts without choosing a trail; the trail is settled at Finish (suggestions, then "name a new trail"). Picking a trail first still works.
7. **Visibility:** user trails are visible only to their owner (RLS). Plan 3 widens this to friends.
8. **Demo trails:** the old mock trails leave the default list. Ones a hiker has already logged stay on their device.

## Review Focus

- A recording with no GPS fixes (indoor test, denied permission) reaching Finish: naming still works, the trail has no path and nothing draws it.
- A typed name that is blank or only spaces: Save stays disabled; names are trimmed.
- Existing installs: the persisted trail cache must gain the catalog without losing trails that have logs.
- Signed-in sync of a log on a user trail: the trail row must reach Supabase before the log (foreign key).
- Out-and-back catalog trails: the shown distance is the round trip, not the one-way line.

---

### Task 1: Migration 008

**Files:**
- Create: `supabase/migrations/008_trail_catalog.sql`
- Modify: `ARCHITECTURE.md` (migration list)

- [ ] Add to `public.trails` (all `if not exists`): `source text not null default 'catalog'` checked in (`catalog`, `user`); `owner_id uuid references auth.users(id) on delete cascade`; `osm_ref text`; `shape text` checked in (`loop`, `out-and-back`, `point-to-point`) or null; `trailhead geography(Point, 4326)`. A named check `trails_owner_matches_source` that `(source = 'user') = (owner_id is not null)`, added inside a `do $$ … if not exists (pg_constraint) … $$`.
- [ ] Drop `not null` on `path`, `distance_km`, `elevation_gain_m`, `peak_elevation_m` (a hike logged without GPS has none of these).
- [ ] Indexes: `trails_owner_idx (owner_id)`, gist on `trailhead`.
- [ ] RLS: drop `trails_select_authenticated`; create `trails_select_catalog_or_own` (`owner_id is null or owner_id = auth.uid()`), and insert/update/delete policies for `owner_id = auth.uid() and source = 'user'`. Each `drop policy if exists` first.
- [ ] Grants: `select, insert, update, delete on public.trails to authenticated`.
- [ ] `create or replace view public.trails_api` with the old columns first, then `source, owner_id, osm_ref, shape, st_asgeojson(trailhead)::jsonb as trailhead`; re-grant select.
- [ ] Add a status line to the owner's check list in the PR description (008 columns present).
- [ ] Commit.

### Task 2: Route geometry library

**Files:**
- Create: `lib/catalogRoute.ts`, `lib/catalogRoute.test.ts`; register in `package.json` test script.

**Interfaces — Produces:**
- `type Network = { nodes: Record<string, [number, number]>; ways: { id: number; name: string | null; highway: string; nodes: number[] }[] }`
- `routeThrough(network: Network, stops: [number, number][], prefer: string[]): { coordinates: [number, number][]; wayIds: number[] } | null` — snaps each stop to the nearest network node (null if over 300 m), runs Dijkstra between consecutive stops. Edge cost = metres × 0.6 when the way name matches `prefer` (case-insensitive substring), × 1 for path/footway/steps/bridleway/track, × 4 for other roads.
- `lineLengthM(coords): number`, `simplify(coords, toleranceM): coords` (Douglas–Peucker in local metres), `resample(coords, stepM, maxSamples): { coord, distanceM }[]`.

- [ ] Tests: two-route network where the preferred-name path wins even though longer by 20%; loop through 2 stops returns to start; stop 1 km from any node returns null; simplify keeps endpoints and drops collinear points; resample spacing and cap.
- [ ] Implement, pass, commit.

### Task 3: Catalog build library

**Files:**
- Create: `lib/catalogBuild.ts`, `lib/catalogBuild.test.ts`; register.

**Interfaces — Produces:**
- `type CuratedTrail = { slug: string; name: string; region: string; extract: string; shape: 'loop' | 'out-and-back' | 'point-to-point'; trailhead: [number, number]; via: [number, number][]; prefer: string[]; expectKm: number }`
- `type RouteFile = { slug: string; wayIds: number[]; coordinates: [number, number][] }`
- `catalogId(slug: string): string` — deterministic UUID v4-shaped id from a 128-bit FNV-style hash of `apex-catalog:${slug}`.
- `trailFromRoute(curated, route, elevations: number[], sampleDistancesM: number[], now: string): Trail` — out-and-back mirrors the profile and doubles distance; gain sums rises over 1 m between samples; `trailhead = coordinates[0]`; `source = 'catalog'`; `osm_ref = 'way/' + ids joined by ','`.
- `seedSql(trails: Trail[]): string` — `insert … on conflict (id) do update`, path via `st_geogfromtext`, trailhead via `st_geogpoint`.

- [ ] Tests: `catalogId` stable and passes `isUuid`'s regex; out-and-back of a 1 km line with profile 100→200 gives 2 km, gain 100, profile ends at 2000 m at 100; loop not doubled; SQL escapes `'` in names and contains `on conflict (id)`.
- [ ] Implement, pass, commit.

### Task 4: Pipeline scripts and first catalog

**Files:**
- Create: `scripts/catalog/README.md`, `scripts/catalog/trails.json` (curated list), `scripts/catalog/extract_network.py`, `scripts/catalog/fetch-extract.sh`, `scripts/catalog/route.ts`, `scripts/catalog/build.ts`, `scripts/catalog/routes/*.json`, `scripts/catalog/elevation-cache.json`, `data/catalogTrails.json`, `supabase/seed/catalog_trails.sql`.

- [ ] `extract_network.py <pbf> <out-dir> <trails.json>`: pyosmium with node locations; for each curated trail whose `extract` matches the file, keep ways with a `highway` tag that have a node inside the trail's bbox (trailhead and via points, padded 3 km); write `<slug>.network.json` in the `Network` shape. Exclude `motorway`, `trunk`, `primary`.
- [ ] `fetch-extract.sh <geofabrik-region>`: download to `mktemp -d`, run the extractor, delete the pbf. Prints the size first.
- [ ] `route.ts <network-dir>`: `routeThrough` per trail, warn when length (doubled for out-and-back) is outside ±30% of `expectKm`, write `routes/<slug>.json`.
- [ ] `build.ts`: simplify (5 m), resample (every 50 m, max 200), elevations from `https://api.opentopodata.org/v1/ned10m` in batches of 100, one request per 1.1 s, cached by rounded coordinate in `elevation-cache.json`; write the two outputs, sorted by name.
- [ ] Run for the 5 states; check every warning by eye against the expected distance; fix `via`/`prefer` and rerun.
- [ ] Commit.

### Task 5: Trail types, cache merge, sync

**Files:**
- Modify: `types/trail.ts`, `stores/trailCache.ts`, `lib/remoteSync.ts`
- Create: `lib/catalog.ts` (`CATALOG_TRAILS`, `mergeCatalog`), `lib/trailCatalogMerge.test.ts` (node)

**Interfaces — Produces:**
- `Trail` gains optional `source?: 'catalog' | 'user'`, `owner_id?: string | null`, `osm_ref?: string | null`, `shape?: … | null`, `trailhead?: [number, number] | null`.
- `mergeCatalog(persisted: Trail[], catalog: Trail[], loggedIds: Set<string>): Trail[]` — catalog rows replace same-id rows; user trails kept; other non-catalog rows kept only if logged.
- `useTrailCache` gains `addTrail(trail: Trail)`; persist `merge` runs `mergeCatalog`.
- `remoteSync`: `mapTrail` accepts a null path (empty coordinates) and the new columns; `pushTrail(trail)`; `sendLog` sends the log's user trail first; outbox kind `'trail'`.

- [ ] Tests for `mergeCatalog` (the three rules, and order: catalog first by name, then user trails newest first).
- [ ] Implement, `npx tsc --noEmit`, commit.

### Task 6: Matching and user trails

**Files:**
- Create: `lib/trailMatch.ts`, `lib/trailMatch.test.ts`, `lib/userTrail.ts`, `lib/userTrail.test.ts`; register both.

**Interfaces — Produces:**
- `MATCH_RADIUS_M = 500`; `matchTrails(start: {latitude, longitude}, path: [number, number][], trails: MatchTrail[], limit = 3): { trailId: string; startDistanceM: number; overlap: number }[]` — trailhead is `trail.trailhead ?? first path point` (and the last point for point-to-point); overlap = share of up to 100 sampled recording points within 60 m of the trail line; sort by overlap desc then distance.
- `cleanTrailName(raw: string): string | null` — trim, collapse spaces, max 60 chars, null if empty.
- `buildUserTrail({ id, ownerId, name, region, points, distanceM, gainM, durationSeconds, now }): Trail` — `source: 'user'`; path simplified to 5 m (empty when under 2 points); profile from point altitudes downsampled to 120; distance null when under 10 m; peak = max altitude or null.

- [ ] Tests: start 300 m from a trailhead matches, 700 m does not; higher overlap wins over closer trailhead; empty trails list; name cleaning; user trail from 0 points has empty path and null stats; from a 3-point climb has distance, gain and peak.
- [ ] Implement, pass, commit.

### Task 7: Finish and past-hike UI

**Files:**
- Create: `components/log/TrailAssignSheet.tsx`, `components/log/__tests__/TrailAssignSheet.test.tsx` (jest)
- Modify: `app/(tabs)/log.tsx`, `hooks/useTrailTracker.ts` (`complete(trailId?: string)`), `components/log/PastHikeSheet.tsx` (new-trail row), `app/trail/[id].tsx` and `components/trail/TrailMap*.tsx` caller (credit line), `app/(tabs)/index.tsx` (credit footer), `app/credits.tsx` (data credits).

- [ ] `TrailAssignSheet` props: `{ visible, suggestions: { trail: Trail; startDistanceM: number }[], onPick(trailId), onCreate(name), onClose }`. Suggestion cards are photo-led (Mapbox satellite cover via `mapCoverUrl`, dark gradient, Bricolage name with text shadow, mono meta "0.2 MI FROM YOUR START · 6.2 MI · ▲2,100 FT", "© OpenStreetMap" on catalog cards). Below: "Name a new trail" input and Save (sage, disabled until `cleanTrailName` passes).
- [ ] jest: renders suggestions with credit; Save disabled for "   "; Save calls `onCreate('Bear Gulch')` for "  Bear   Gulch ".
- [ ] Log screen: the trail list gets a first row "Name it at the end" (default). Finish on a hike without a trail opens the sheet; pick → `complete(id)`; create → `buildUserTrail` + `addTrail` + `pushTrail` + `complete(newId)`; then ranking as today.
- [ ] Past hike: "New trail" row in the picker with a name field; Continue creates the user trail (no path) and logs against it.
- [ ] Credits: trail page shows "Trail data © OpenStreetMap contributors · Elevation USGS" under the map for catalog trails; list footer when any catalog trail shows; credits screen lists OSM (ODbL), USGS 3DEP via Open Topo Data.
- [ ] Verify on Expo web at 390×844, commit.

### Task 8: Ship

- [ ] `npm test`, `npx tsc --noEmit` pass.
- [ ] Update roadmap row 2; PR against main with screenshots and owner decisions.
