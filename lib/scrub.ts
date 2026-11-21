export interface ScrubPoint {
  distanceM: number;
  elevationM: number;
  climbedM: number;
}

type Sample = { distance_m: number; elevation_m: number };

const FT_TO_M = 0.3048;

export function canScrub(profile: { distance_m: number }[]): boolean {
  return profile.length >= 2;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Position, elevation and total climb at a 0..1 fraction along the profile. */
export function scrubAt(profile: Sample[], fraction: number): ScrubPoint | null {
  if (!canScrub(profile)) return null;
  const first = profile[0].distance_m;
  const last = profile[profile.length - 1].distance_m;
  const target = first + clamp01(fraction) * (last - first);

  let climbedM = 0;
  for (let i = 1; i < profile.length; i++) {
    const a = profile[i - 1];
    const b = profile[i];
    if (target <= b.distance_m || i === profile.length - 1) {
      const span = b.distance_m - a.distance_m;
      const t = span > 0 ? Math.min(1, Math.max(0, (target - a.distance_m) / span)) : 1;
      const elevationM = a.elevation_m + (b.elevation_m - a.elevation_m) * t;
      climbedM += Math.max(0, elevationM - a.elevation_m);
      return { distanceM: target, elevationM, climbedM };
    }
    climbedM += Math.max(0, b.elevation_m - a.elevation_m);
  }
  return null;
}

/** Maps a progress fraction to a position on the route; out-and-backs fold at the turnaround. */
export function routeFraction(
  shape: 'loop' | 'out-and-back' | 'point-to-point' | null | undefined,
  fraction: number,
): number {
  const f = clamp01(fraction);
  if (shape === 'out-and-back') return f <= 0.5 ? f * 2 : (1 - f) * 2;
  return f;
}

/** Number of step-sized marks (default 500 ft) between two distances in metres. */
export function ticksCrossed(fromM: number, toM: number, stepFt = 500): number {
  const step = stepFt * FT_TO_M;
  return Math.abs(Math.floor(toM / step) - Math.floor(fromM / step));
}
