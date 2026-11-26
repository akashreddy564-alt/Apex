/**
 * What the Log tab's summit register shows for the newest hike: its reasons
 * and its rank. Pure, so node tests can run it (no `@/` imports).
 */
import { describePlacement, overallByScore, type Bucket, type StoredRanking } from './ranking.ts';
import { hikeReasons, rankReason } from './reasons.ts';

export interface RegisterLog {
  id: string;
  trail_id: string;
  created_at: string;
  duration_seconds: number;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
}

export interface RegisterTrail {
  id: string;
  name: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
}

export interface RegisterReasons {
  distance: string | null;
  climb: string | null;
  time: string | null;
}

export interface RegisterRank {
  bucket: Bucket;
  /** Hikes in the bucket, for the badge. */
  count: number;
  score: number;
  /** Place in the overall list, 1 = best. */
  ordinal: number;
  total: number;
  reason: string | null;
}

export const NO_REASONS: RegisterReasons = { distance: null, climb: null, time: null };

/** The hike with the latest `created_at`, or null. */
export function newestLog<L extends RegisterLog>(logs: readonly L[]): L | null {
  let latest: L | null = null;
  for (const log of logs) {
    if (!latest || Date.parse(log.created_at) > Date.parse(latest.created_at)) latest = log;
  }
  return latest;
}

/**
 * Reasons for `log` against every other hike. A hike's own numbers win and its
 * trail's catalog figures fill the gaps, as in `weeklyProgress`.
 */
export function registerReasons<L extends RegisterLog>(
  log: L,
  logs: readonly L[],
  trailOf: (id: string) => RegisterTrail | undefined,
): RegisterReasons {
  // Records compare hikes by their own numbers; a catalog figure is a guess.
  const input = (l: L) => ({
    id: l.id,
    distance_km: l.distance_km ?? null,
    elevation_gain_m: l.elevation_gain_m ?? null,
    duration_seconds: l.duration_seconds,
  });
  // hikeReasons leaves the hike itself out of the comparison by id.
  return hikeReasons(input(log), logs.map(input));
}

/**
 * The trail's place in the overall list (same person and hike type), with
 * the trails just below and just above it named in the reason.
 */
export function registerRank(
  rankings: StoredRanking[],
  trailId: string,
  trailOf: (id: string) => RegisterTrail | undefined,
): RegisterRank | null {
  const placement = describePlacement(rankings, trailId);
  if (!placement) return null;
  const overall = overallByScore(
    rankings.filter(
      (r) => r.user_id === placement.ranking.user_id && r.hike_type === placement.ranking.hike_type,
    ),
  );
  const at = overall.findIndex((r) => r.trail_id === trailId);
  const nameAt = (i: number) => (overall[i] ? (trailOf(overall[i].trail_id)?.name ?? null) : null);
  return {
    bucket: placement.ranking.bucket,
    count: placement.count,
    score: placement.score,
    ordinal: at + 1,
    total: overall.length,
    reason: rankReason(nameAt(at + 1), nameAt(at - 1)),
  };
}
