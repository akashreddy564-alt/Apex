/**
 * A trail's numbers as you hiked it. Catalog distances and climbs are guesses
 * for most trails (a park's "trail" is a network of paths), so every screen
 * shows your own most recent hike instead, and "Not hiked yet" before that.
 * Pure, so it runs under node tests.
 */

export interface StatsLog {
  trail_id: string;
  created_at: string;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
  duration_seconds?: number | null;
}

export interface YourTrailStats {
  /** How many times you've hiked it. */
  hikes: number;
  /** From your most recent hike; null when that hike has no measurement. */
  distanceKm: number | null;
  elevationGainM: number | null;
  durationSeconds: number | null;
  lastHikedAt: string;
}

const positive = (value: number | null | undefined): number | null =>
  value != null && Number.isFinite(value) && value > 0 ? value : null;

function statsOf(latest: StatsLog, hikes: number): YourTrailStats {
  const distanceKm = positive(latest.distance_km);
  const gain = latest.elevation_gain_m;
  // A flat walk really climbs 0 m; with no distance either, 0 just means "not measured".
  const elevationGainM =
    gain != null && Number.isFinite(gain) && (gain > 0 || (gain === 0 && distanceKm != null)) ? gain : null;
  return {
    hikes,
    distanceKm,
    elevationGainM,
    durationSeconds: positive(latest.duration_seconds),
    lastHikedAt: latest.created_at,
  };
}

/** Every trail you've hiked, by trail id. */
export function yourStatsByTrail(logs: readonly StatsLog[]): Map<string, YourTrailStats> {
  const latest = new Map<string, StatsLog>();
  const counts = new Map<string, number>();
  for (const log of logs) {
    counts.set(log.trail_id, (counts.get(log.trail_id) ?? 0) + 1);
    const seen = latest.get(log.trail_id);
    if (!seen || log.created_at > seen.created_at) latest.set(log.trail_id, log);
  }
  const out = new Map<string, YourTrailStats>();
  for (const [id, log] of latest) out.set(id, statsOf(log, counts.get(id) ?? 1));
  return out;
}

/** Your numbers for one trail, or null if you haven't hiked it. */
export function yourTrailStats(trailId: string, logs: readonly StatsLog[]): YourTrailStats | null {
  return yourStatsByTrail(logs.filter((log) => log.trail_id === trailId)).get(trailId) ?? null;
}
