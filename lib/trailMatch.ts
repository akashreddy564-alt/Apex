/**
 * Which known trails a hike probably was, from where the recording started.
 * Runs on the device against the bundled catalog and the hiker's own trails,
 * so it works signed out and offline.
 */
import type { GeoJSONLineString, TrailShape } from '@/types/trail';

import { distanceM, distanceToLineM, type LonLat } from './catalogRoute.ts';

/** A recording that starts this close to a trailhead suggests that trail. */
export const MATCH_RADIUS_M = 500;
/** A recorded point this close to a trail line counts as on it. */
const ON_TRAIL_M = 60;
const OVERLAP_SAMPLES = 100;

export interface MatchTrail {
  id: string;
  path: Pick<GeoJSONLineString, 'coordinates'>;
  trailhead?: LonLat | null;
  shape?: TrailShape | null;
}

export interface TrailMatch {
  trailId: string;
  startDistanceM: number;
  /** Share of the recording that runs along the trail, 0–1. */
  overlap: number;
}

function line(trail: MatchTrail): LonLat[] {
  return trail.path.coordinates
    .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map((c) => [c[0], c[1]] as LonLat);
}

function sample(points: LonLat[]): LonLat[] {
  if (points.length <= OVERLAP_SAMPLES) return points;
  const step = (points.length - 1) / (OVERLAP_SAMPLES - 1);
  return Array.from({ length: OVERLAP_SAMPLES }, (_, i) => points[Math.round(i * step)]!);
}

export function matchTrails(
  start: { latitude: number; longitude: number },
  recording: LonLat[],
  trails: MatchTrail[],
  limit = 3,
): TrailMatch[] {
  const origin: LonLat = [start.longitude, start.latitude];
  const probe = sample(recording);
  const matches: TrailMatch[] = [];
  for (const trail of trails) {
    const coords = line(trail);
    if (coords.length < 2) continue;
    const heads: LonLat[] = [trail.trailhead ?? coords[0]!];
    // A one-way trail can be walked from either end.
    if (trail.shape === 'point-to-point') heads.push(coords[coords.length - 1]!);
    const startDistanceM = Math.min(...heads.map((h) => distanceM(origin, h)));
    if (startDistanceM > MATCH_RADIUS_M) continue;
    const onTrail = probe.filter((p) => distanceToLineM(p, coords) <= ON_TRAIL_M).length;
    matches.push({
      trailId: trail.id,
      startDistanceM,
      overlap: probe.length === 0 ? 0 : onTrail / probe.length,
    });
  }
  matches.sort((a, b) => b.overlap - a.overlap || a.startDistanceM - b.startDistanceM);
  return matches.slice(0, limit);
}

/** Trails whose name or region contains every typed word. Blank shows none. */
export function searchTrails<T extends { name: string; region: string }>(
  trails: T[],
  query: string,
  limit = 6,
): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return trails
    .filter((trail) => {
      const text = `${trail.name} ${trail.region}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .slice(0, limit);
}
