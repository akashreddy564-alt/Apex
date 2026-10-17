/**
 * Trail context numbers for the stats block. Pure, so node tests can run it
 * (no `@/` imports).
 */

const FEET_PER_METRE = 3.28084;
const KM_PER_MILE = 1.609344;
const MISSING = '–';

export type DifficultyRating = { score: number; label: string; level: 0 | 1 | 2 | 3 | 4 };

/** NPS Shenandoah bands: upper score limit for each label. */
const BANDS: Array<[number, string]> = [
  [50, 'Easiest'],
  [100, 'Moderate'],
  [150, 'Moderately strenuous'],
  [200, 'Strenuous'],
  [Number.POSITIVE_INFINITY, 'Very strenuous'],
];

/**
 * National Park Service (Shenandoah) hiking difficulty:
 * sqrt(elevation gain in feet × 2 × distance in miles).
 */
export function difficultyRating(
  distanceKm: number | null,
  gainM: number | null,
): DifficultyRating | null {
  if (distanceKm == null || gainM == null || distanceKm <= 0 || gainM < 0) return null;
  const score = Math.sqrt(gainM * FEET_PER_METRE * 2 * (distanceKm / KM_PER_MILE));
  const level = BANDS.findIndex(([limit]) => score < limit) as DifficultyRating['level'];
  return { score, label: BANDS[level][1], level };
}

/** Feet of climbing per mile of trail. */
export function climbRateFtPerMile(distanceKm: number | null, gainM: number | null): number | null {
  if (distanceKm == null || gainM == null || distanceKm <= 0) return null;
  return Math.round((gainM * FEET_PER_METRE) / (distanceKm / KM_PER_MILE));
}

/** Average moving pace as `m:ss` per mile. */
export function paceLabel(distanceKm: number | null, movingSeconds: number | null): string {
  if (distanceKm == null || movingSeconds == null || distanceKm <= 0) return MISSING;
  const perMile = Math.round(movingSeconds / (distanceKm / KM_PER_MILE));
  const minutes = Math.floor(perMile / 60);
  return `${minutes}:${String(perMile % 60).padStart(2, '0')}`;
}
