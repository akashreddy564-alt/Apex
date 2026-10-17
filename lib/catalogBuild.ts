/**
 * Turns a curated trail plus its routed OSM line and USGS elevations into a
 * catalog `Trail`, and catalog trails into the Supabase seed.
 * Pure, so it runs under node tests and the pipeline scripts.
 */
import type { ElevationSample, Trail, TrailShape } from '@/types/trail';

import { lineLengthM, type LonLat } from './catalogRoute.ts';

export interface CuratedTrail {
  slug: string;
  name: string;
  region: string;
  /** Geofabrik region path, e.g. `utah` or `california/norcal`. */
  extract: string;
  shape: TrailShape;
  /** [lon, lat]. The route starts here. */
  trailhead: LonLat;
  /** Points the route passes through after the trailhead, in order. */
  via: LonLat[];
  /** Trail names the route should follow where it can. */
  prefer: string[];
  /** Published length of the whole hike, used to flag a bad route. */
  expectKm: number;
  /** Where the published length comes from. */
  source?: string;
}

/** Committed output of the routing step. Our hosted extract. */
export interface RouteFile {
  slug: string;
  wayIds: number[];
  coordinates: LonLat[];
}

/** Rises smaller than this between samples are DEM noise. */
const GAIN_STEP_M = 1;

/** 128 bits from four FNV-1a passes, shaped as a v4 UUID. Stable per slug. */
export function catalogId(slug: string): string {
  const input = `apex-catalog:${slug}`;
  let hex = '';
  for (let pass = 0; pass < 4; pass++) {
    let h = (0x811c9dc5 ^ Math.imul(pass + 1, 0x9e3779b1)) >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += h.toString(16).padStart(8, '0');
  }
  const chars = hex.split('');
  chars[12] = '4';
  chars[16] = ((parseInt(chars[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = chars.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** Whole-hike profile: out-and-back walks the line, then walks it back. */
function hikeProfile(shape: TrailShape, elevations: number[], distances: number[], oneWayM: number): ElevationSample[] {
  const out = elevations.map((elevation_m, i) => ({
    distance_m: Math.round(distances[i]!),
    elevation_m: Math.round(elevation_m),
  }));
  if (shape !== 'out-and-back') return out;
  const back = [];
  for (let i = elevations.length - 2; i >= 0; i--) {
    back.push({
      distance_m: Math.round(2 * oneWayM - distances[i]!),
      elevation_m: Math.round(elevations[i]!),
    });
  }
  return [...out, ...back];
}

function gain(profile: ElevationSample[]): number {
  let total = 0;
  let base = profile[0]?.elevation_m ?? 0;
  for (const sample of profile) {
    const rise = sample.elevation_m - base;
    if (rise >= GAIN_STEP_M) {
      total += rise;
      base = sample.elevation_m;
    } else if (rise < 0) {
      base = sample.elevation_m;
    }
  }
  return Math.round(total);
}

export function trailFromRoute(
  curated: CuratedTrail,
  route: RouteFile,
  elevations: number[],
  sampleDistancesM: number[],
  now: string,
): Trail {
  const oneWayM = lineLengthM(route.coordinates);
  const totalM = curated.shape === 'out-and-back' ? oneWayM * 2 : oneWayM;
  const profile = hikeProfile(curated.shape, elevations, sampleDistancesM, oneWayM);
  // Profile values are rounded to whole metres before gain is summed.
  const peak = profile.length > 0 ? Math.max(...profile.map((s) => s.elevation_m)) : null;
  return {
    id: catalogId(curated.slug),
    name: curated.name,
    region: curated.region,
    distance_km: Math.round(totalM / 10) / 100,
    elevation_gain_m: profile.length > 1 ? gain(profile) : null,
    peak_elevation_m: peak,
    path: {
      type: 'LineString',
      coordinates: route.coordinates.map(([lon, lat]) => [round5(lon), round5(lat)] as [number, number]),
    },
    elevation_profile: profile,
    avg_moving_time_seconds: null,
    created_at: now,
    updated_at: now,
    source: 'catalog',
    owner_id: null,
    osm_ref: `way/${route.wayIds.join(',')}`,
    shape: curated.shape,
    trailhead: [round5(route.coordinates[0]![0]), round5(route.coordinates[0]![1])],
  };
}

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNum(value: number | null | undefined): string {
  return value == null ? 'null' : String(value);
}

export function seedSql(trails: Trail[]): string {
  const rows = trails.map((t) => {
    const line = t.path.coordinates.map((c) => `${c[0]} ${c[1]}`).join(', ');
    const head = t.trailhead
      ? `st_setsrid(st_makepoint(${t.trailhead[0]}, ${t.trailhead[1]}), 4326)::geography`
      : 'null';
    return [
      `(`,
      `  ${sqlText(t.id)}, ${sqlText(t.name)}, ${sqlText(t.region)},`,
      `  ${sqlNum(t.distance_km)}, ${sqlNum(t.elevation_gain_m)}, ${sqlNum(t.peak_elevation_m)},`,
      `  st_geogfromtext('SRID=4326;LINESTRING(${line})'),`,
      `  ${sqlText(JSON.stringify(t.elevation_profile))}::jsonb,`,
      `  'catalog', null, ${t.osm_ref ? sqlText(t.osm_ref) : 'null'}, ${t.shape ? sqlText(t.shape) : 'null'},`,
      `  ${head}`,
      `)`,
    ].join('\n');
  });
  return [
    '-- Generated by scripts/catalog/build.ts. Do not edit by hand.',
    '-- Trail lines © OpenStreetMap contributors (ODbL). Elevation: USGS 3DEP via Open Topo Data.',
    '-- Run after migration 008. Safe to run again: rows are matched by id.',
    '',
    'insert into public.trails (',
    '  id, name, region, distance_km, elevation_gain_m, peak_elevation_m,',
    '  path, elevation_profile, source, owner_id, osm_ref, shape, trailhead',
    ') values',
    rows.join(',\n'),
    'on conflict (id) do update set',
    '  name = excluded.name,',
    '  region = excluded.region,',
    '  distance_km = excluded.distance_km,',
    '  elevation_gain_m = excluded.elevation_gain_m,',
    '  peak_elevation_m = excluded.peak_elevation_m,',
    '  path = excluded.path,',
    '  elevation_profile = excluded.elevation_profile,',
    '  osm_ref = excluded.osm_ref,',
    '  shape = excluded.shape,',
    '  trailhead = excluded.trailhead,',
    '  updated_at = now();',
    '',
  ].join('\n');
}
