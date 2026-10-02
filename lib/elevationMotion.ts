import type { ElevationSample } from '@/types/trail';

/** In-place shape change after a same-trail profile write. */
export const SHAPE_EASE_MS = 300;
/** Optional settle when a telemetry number changes without a new trail. */
export const STAT_FADE_MS = 300;

export interface RevealState {
  trailId: string | null;
  /** 0–1. 1 means the profile is fully drawn. */
  reveal: number;
  hapticIndex: number | null;
}

export interface ElevationUpdate {
  trailId: string;
  samplesChanged: boolean;
  reducedMotion: boolean;
}

/**
 * The 10s wipe is keyed on trail id. A new `elevation_profile` for the open
 * trail keeps the clip fully open and eases the shape. A different trail
 * starts its own wipe, and the scrub haptic index does not carry over.
 */
export function applyElevationUpdate(
  state: RevealState,
  update: ElevationUpdate,
): RevealState & { replay: boolean; easeShape: boolean } {
  const trailChanged = state.trailId !== update.trailId;
  if (trailChanged) {
    return {
      trailId: update.trailId,
      reveal: update.reducedMotion ? 1 : 0,
      hapticIndex: null,
      replay: !update.reducedMotion,
      easeShape: false,
    };
  }
  return {
    trailId: state.trailId,
    reveal: state.reveal,
    hapticIndex: state.hapticIndex,
    replay: false,
    easeShape: update.samplesChanged && !update.reducedMotion,
  };
}

/** Width of `elevation-reveal-clip`. Full draw is `chartWidth`. */
export function clipWidth(chartWidth: number, reveal: number): number {
  'worklet';
  return Math.max(0, chartWidth * reveal);
}

/** Ease-out cubic. `t` is linear time in 0–1. */
export function shapeEase(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function sampleAt(samples: ElevationSample[], index: number, count: number): ElevationSample {
  if (samples.length === count) return samples[index];
  const pos = count <= 1 ? 0 : index / (count - 1);
  const src = pos * (samples.length - 1);
  const lo = Math.floor(src);
  const hi = Math.min(samples.length - 1, lo + 1);
  const f = src - lo;
  const a = samples[lo];
  const b = samples[hi];
  return {
    distance_m: a.distance_m + (b.distance_m - a.distance_m) * f,
    elevation_m: a.elevation_m + (b.elevation_m - a.elevation_m) * f,
  };
}

/**
 * One geometry for the stroke and the fill. `t` 0 is the current line,
 * `t` 1 is the incoming profile. The result always has points when either
 * input does, so the plot is never cleared to draw the next shape.
 */
export function blendProfiles(
  from: ElevationSample[],
  to: ElevationSample[],
  t: number,
): ElevationSample[] {
  if (from.length === 0) return to;
  if (to.length === 0) return from;
  if (t <= 0) return from;
  if (t >= 1) return to;
  const count = Math.max(from.length, to.length);
  const blended: ElevationSample[] = [];
  for (let i = 0; i < count; i++) {
    const a = sampleAt(from, i, count);
    const b = sampleAt(to, i, count);
    blended.push({
      distance_m: a.distance_m + (b.distance_m - a.distance_m) * t,
      elevation_m: a.elevation_m + (b.elevation_m - a.elevation_m) * t,
    });
  }
  return blended;
}

export interface CountState {
  trailId: string | null;
  value: number | null;
}

/**
 * The 8s count-up runs when a trail opens. A later number for that same
 * trail is shown directly, with a short fade, and does not restart the count.
 */
export function planCountUp(
  prev: CountState,
  next: { trailId: string; value: number | null },
): { replay: boolean; showDirect: boolean; fadeMs: number } {
  const trailChanged = prev.trailId !== next.trailId;
  if (trailChanged) {
    return { replay: next.value != null, showDirect: false, fadeMs: 0 };
  }
  return {
    replay: false,
    showDirect: true,
    fadeMs: prev.value !== next.value ? STAT_FADE_MS : 0,
  };
}
