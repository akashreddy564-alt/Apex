/**
 * A hiker's own trail, made when a hike matches nothing in the catalog.
 * The name is typed; the line and climb come from the recording.
 */
import type { ElevationSample, Trail } from '@/types/trail';

import { distanceM, simplify, type LonLat } from './catalogRoute.ts';

export const TRAIL_NAME_MAX = 60;
/** Shown where a user trail has no place name. */
export const USER_TRAIL_REGION = 'Your trail';
const SIMPLIFY_M = 5;
const PROFILE_MAX = 120;
const MIN_DISTANCE_M = 10;

export function cleanTrailName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, TRAIL_NAME_MAX).trim();
  return name.length > 0 ? name : null;
}

export interface UserTrailInput {
  id: string;
  ownerId: string;
  /** Already cleaned with `cleanTrailName`. */
  name: string;
  region: string | null;
  points: { longitude: number; latitude: number; altitude: number | null }[];
  /** Running totals from the recording, which already drop GPS noise. */
  distanceM: number;
  gainM: number;
  durationSeconds: number;
  now: string;
}

function profile(points: UserTrailInput['points']): ElevationSample[] {
  const samples: ElevationSample[] = [];
  let along = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (i > 0) {
      const q = points[i - 1]!;
      along += distanceM([q.longitude, q.latitude], [p.longitude, p.latitude]);
    }
    if (p.altitude != null && Number.isFinite(p.altitude)) {
      samples.push({ distance_m: Math.round(along), elevation_m: Math.round(p.altitude) });
    }
  }
  if (samples.length <= PROFILE_MAX) return samples;
  const step = (samples.length - 1) / (PROFILE_MAX - 1);
  return Array.from({ length: PROFILE_MAX }, (_, i) => samples[Math.round(i * step)]!);
}

export function buildUserTrail(input: UserTrailInput): Trail {
  const coords = input.points
    .filter((p) => Number.isFinite(p.longitude) && Number.isFinite(p.latitude))
    .map((p) => [p.longitude, p.latitude] as LonLat);
  const line = coords.length >= 2 ? simplify(coords, SIMPLIFY_M) : [];
  const samples = profile(input.points);
  const peak = samples.length > 0 ? Math.max(...samples.map((s) => s.elevation_m)) : null;
  const measured = input.distanceM >= MIN_DISTANCE_M;
  return {
    id: input.id,
    name: input.name,
    region: input.region?.trim() || USER_TRAIL_REGION,
    distance_km: measured ? Math.round(input.distanceM / 10) / 100 : null,
    elevation_gain_m: measured ? Math.round(input.gainM) : null,
    peak_elevation_m: peak,
    path: { type: 'LineString', coordinates: line },
    elevation_profile: samples.length >= 2 ? samples : [],
    avg_moving_time_seconds: input.durationSeconds > 0 ? input.durationSeconds : null,
    created_at: input.now,
    updated_at: input.now,
    source: 'user',
    owner_id: input.ownerId,
    osm_ref: null,
    shape: null,
    trailhead: line.length > 0 ? line[0]! : null,
  };
}
