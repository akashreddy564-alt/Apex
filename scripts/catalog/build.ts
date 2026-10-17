/**
 * Step 3: add USGS elevation to each routed line and write the catalog.
 *
 * Usage: node --experimental-strip-types scripts/catalog/build.ts
 *
 * Reads scripts/catalog/trails.json and scripts/catalog/routes/*.json.
 * Elevation comes from Open Topo Data's `ned10m` dataset (USGS 3DEP 1/3
 * arc-second), at most 100 points per request and one request per 1.1 s.
 * Answers are cached in elevation-cache.json so a rebuild sends nothing new.
 * Writes data/catalogTrails.json (bundled in the app) and
 * supabase/seed/catalog_trails.sql (paste into Supabase after migration 008).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { seedSql, trailFromRoute, type CuratedTrail, type RouteFile } from '../../lib/catalogBuild.ts';
import { resample, simplify } from '../../lib/catalogRoute.ts';
import type { Trail } from '../../types/trail.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const ENDPOINT = 'https://api.opentopodata.org/v1/ned10m';
const BATCH = 100;
const WAIT_MS = 1100;
const SIMPLIFY_M = 5;
const SAMPLE_STEP_M = 50;
const MAX_SAMPLES = 200;

const cachePath = join(here, 'elevation-cache.json');
const cache: Record<string, number> = existsSync(cachePath)
  ? JSON.parse(readFileSync(cachePath, 'utf8'))
  : {};
const key = ([lon, lat]: [number, number]) => `${lat.toFixed(5)},${lon.toFixed(5)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function elevations(points: [number, number][]): Promise<number[]> {
  const missing = [...new Set(points.map(key).filter((k) => !(k in cache)))];
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const res = await fetch(`${ENDPOINT}?locations=${batch.join('|')}`);
    if (!res.ok) throw new Error(`Open Topo Data ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { results: { elevation: number | null }[] };
    body.results.forEach((r, j) => {
      if (r.elevation == null) throw new Error(`no USGS elevation at ${batch[j]}`);
      cache[batch[j]!] = Math.round(r.elevation * 10) / 10;
    });
    writeFileSync(cachePath, `${JSON.stringify(cache, Object.keys(cache).sort(), 0)}\n`);
    await sleep(WAIT_MS);
  }
  return points.map((p) => cache[key(p)]!);
}

const curated = JSON.parse(readFileSync(join(here, 'trails.json'), 'utf8')) as CuratedTrail[];
const now = new Date().toISOString();
const trails: Trail[] = [];
for (const trail of curated) {
  const routePath = join(here, 'routes', `${trail.slug}.json`);
  if (!existsSync(routePath)) {
    console.log(`- ${trail.slug}: no route yet, skipped`);
    continue;
  }
  const route = JSON.parse(readFileSync(routePath, 'utf8')) as RouteFile;
  const line = simplify(route.coordinates, SIMPLIFY_M);
  const samples = resample(line, SAMPLE_STEP_M, MAX_SAMPLES);
  const heights = await elevations(samples.map((s) => s.coord));
  const built = trailFromRoute(
    trail,
    { ...route, coordinates: line },
    heights,
    samples.map((s) => s.distanceM),
    now,
  );
  trails.push(built);
  console.log(
    `✓ ${trail.slug}: ${built.distance_km} km, +${built.elevation_gain_m} m, peak ${built.peak_elevation_m} m, ${line.length} points`,
  );
}

trails.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(root, 'data/catalogTrails.json'), `${JSON.stringify(trails)}\n`);
mkdirSync(join(root, 'supabase/seed'), { recursive: true });
writeFileSync(join(root, 'supabase/seed/catalog_trails.sql'), seedSql(trails));
console.log(`Wrote ${trails.length} trails.`);
