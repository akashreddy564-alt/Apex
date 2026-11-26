import * as Location from 'expo-location';

import { mapTrail } from '@/lib/remoteSync';
import { supabase } from '@/lib/supabase';
import { useTrailCache } from '@/stores/trailCache';
import type { Trail } from '@/types/trail';

/**
 * The big trail catalog lives on the server (migration 023). The app keeps the
 * 23 curated trails on the phone and asks the server for the rest: by name,
 * near a point, or by id. Fetched trails join the trail cache so the trail
 * page, ranking and matching treat them like any other trail. All of it works
 * signed out; without Supabase it quietly returns nothing.
 */

export interface CatalogHit {
  id: string;
  name: string;
  region: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
  /** Metres from the hiker, when their location is known. */
  away_m: number | null;
}

function optionalNum(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Where the hiker is, only if they already allowed location. Never asks. */
export async function knownPosition(): Promise<[number, number] | null> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    return last ? [last.coords.longitude, last.coords.latitude] : null;
  } catch {
    return null;
  }
}

export async function searchCatalog(query: string, near: [number, number] | null): Promise<CatalogHit[]> {
  const q = query.trim();
  if (!supabase || q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_catalog', {
    q,
    near_lon: near?.[0] ?? null,
    near_lat: near?.[1] ?? null,
    lim: 30,
  });
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row: Record<string, unknown>) =>
    typeof row.id === 'string' && typeof row.name === 'string'
      ? [
          {
            id: row.id,
            name: row.name,
            region: typeof row.region === 'string' ? row.region : '',
            distance_km: optionalNum(row.distance_km),
            elevation_gain_m: optionalNum(row.elevation_gain_m),
            away_m: optionalNum(row.away_m),
          },
        ]
      : [],
  );
}

function rows(data: unknown): Trail[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => mapTrail(row as Record<string, unknown>))
    .filter((trail): trail is Trail => trail !== null);
}

/** Catalog trails whose line passes within radiusM of a point. Cached. */
export async function catalogNear(lon: number, lat: number, radiusM = 600): Promise<Trail[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('catalog_near', { lon, lat, radius_m: radiusM, lim: 20 });
  if (error) return [];
  const trails = rows(data);
  useTrailCache.getState().rememberTrails(trails);
  return trails;
}

/** Whole catalog trails by id, added to the cache. Ids already cached are skipped. */
export async function fetchCatalogTrails(ids: string[]): Promise<Trail[]> {
  const cache = useTrailCache.getState();
  const missing = [...new Set(ids)].filter((id) => !cache.getTrail(id));
  if (!supabase || missing.length === 0) return [];
  const found: Trail[] = [];
  for (let i = 0; i < missing.length; i += 200) {
    const { data, error } = await supabase.rpc('catalog_trails', { ids: missing.slice(i, i + 200) });
    if (error) break;
    found.push(...rows(data));
  }
  useTrailCache.getState().rememberTrails(found);
  return found;
}

/** The trail with this id, from the cache or the server. */
export async function ensureTrail(id: string): Promise<Trail | null> {
  const cached = useTrailCache.getState().getTrail(id);
  if (cached) return cached;
  const [trail] = await fetchCatalogTrails([id]);
  return trail ?? null;
}
