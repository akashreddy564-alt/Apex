/**
 * Step 2: route each curated trail over its network cut and save the line.
 *
 * Usage: node --experimental-strip-types scripts/catalog/route.ts <network-dir> [slug...]
 *
 * Reads <network-dir>/<slug>.network.json (from extract_network.py) and
 * writes scripts/catalog/routes/<slug>.json. Warns when the route length is
 * more than 30% away from the published length, and lists named POIs near
 * any stop that is off the network, so the curated point can be fixed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CuratedTrail, RouteFile } from '../../lib/catalogBuild.ts';
import { distanceM, lineLengthM, routeThrough, SNAP_MAX_M, type LonLat, type Network } from '../../lib/catalogRoute.ts';

const here = dirname(fileURLToPath(import.meta.url));
const [networkDir, ...only] = process.argv.slice(2);
if (!networkDir) {
  console.error('usage: route.ts <network-dir> [slug...]');
  process.exit(1);
}

type Poi = { kind: string; name: string | null; at: LonLat };
const curated = JSON.parse(readFileSync(join(here, 'trails.json'), 'utf8')) as CuratedTrail[];
const outDir = join(here, 'routes');
mkdirSync(outDir, { recursive: true });

let failed = 0;
for (const trail of curated) {
  if (only.length > 0 && !only.includes(trail.slug)) continue;
  const file = join(networkDir, `${trail.slug}.network.json`);
  if (!existsSync(file)) continue;
  const network = JSON.parse(readFileSync(file, 'utf8')) as Network & { pois: Poi[] };
  const stops = [trail.trailhead, ...trail.via];
  const route = routeThrough(network, stops, trail.prefer);
  if (!route) {
    failed++;
    console.log(`✗ ${trail.slug}: no route`);
    const used = new Set(network.ways.flatMap((w) => w.nodes.map(String)));
    for (const stop of stops) {
      let best = Infinity;
      for (const id of used) best = Math.min(best, distanceM(network.nodes[id]!, stop));
      if (best <= SNAP_MAX_M) continue;
      console.log(`    stop ${stop} is ${Math.round(best)} m from the network. Nearby:`);
      network.pois
        .filter((p) => p.name)
        .map((p) => ({ ...p, d: distanceM(p.at, stop) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
        .forEach((p) => console.log(`      ${Math.round(p.d)} m  ${p.kind}  ${p.name}  [${p.at}]`));
    }
    continue;
  }
  const oneWay = lineLengthM(route.coordinates) / 1000;
  const km = trail.shape === 'out-and-back' ? oneWay * 2 : oneWay;
  const off = Math.abs(km - trail.expectKm) / trail.expectKm;
  const names = [...new Set(route.wayIds.map((id) => network.ways.find((w) => w.id === id)?.name ?? '(unnamed)'))];
  console.log(
    `${off > 0.3 ? '⚠' : '✓'} ${trail.slug}: ${km.toFixed(1)} km (published ${trail.expectKm}) via ${names.join(' / ')}`,
  );
  if (off > 0.3) failed++;
  const out: RouteFile = { slug: trail.slug, wayIds: route.wayIds, coordinates: route.coordinates };
  writeFileSync(join(outDir, `${trail.slug}.json`), `${JSON.stringify(out)}\n`);
}
process.exit(failed > 0 ? 1 : 0);
