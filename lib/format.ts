/** Missing metrics. Same en dash the elevation chart uses at rest. */
export const MISSING_METRIC = '\u2013';

/** Deterministic thousands grouping. No locale APIs — same string on web and native. */
function groupInteger(value: number): string {
  'worklet';
  const rounded = Math.round(value);
  const negative = rounded < 0;
  const digits = String(Math.abs(rounded));
  let grouped = '';
  const len = digits.length;
  for (let i = 0; i < len; i++) {
    if (i > 0 && (len - i) % 3 === 0) grouped += ',';
    grouped += digits[i];
  }
  return `${negative ? '-' : ''}${grouped}`;
}

const FEET_PER_METRE = 3.28084;
const KM_PER_MILE = 1.609344;

/** Data stays metric; the US launch displays miles and feet. */
export const DISTANCE_UNIT = 'mi';
export const ELEVATION_UNIT = 'ft';

export function toMiles(km: number): number {
  'worklet';
  return km / KM_PER_MILE;
}

/** For distances the user types in miles. */
export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

export function paceSecondsPerMile(secondsPerKm: number | null): number | null {
  return secondsPerKm == null ? null : secondsPerKm * KM_PER_MILE;
}

export function toFeet(m: number): number {
  'worklet';
  return m * FEET_PER_METRE;
}

/** Takes kilometres, shows miles: `7.7 mi`. */
export function formatDistance(km: number): string {
  'worklet';
  return `${toMiles(km).toFixed(1)} ${DISTANCE_UNIT}`;
}

/** A missing distance is an en dash. Zero is only shown for a real zero. */
export function formatOptionalDistance(km: number | null): string {
  'worklet';
  if (km == null || Number.isNaN(km)) return MISSING_METRIC;
  return formatDistance(km);
}

/** Takes metres, shows whole feet: `4,068 ft`. */
export function formatElevation(m: number): string {
  'worklet';
  return `${groupInteger(toFeet(m))} ${ELEVATION_UNIT}`;
}

export function formatOptionalElevation(m: number | null): string {
  'worklet';
  if (m == null || Number.isNaN(m)) return MISSING_METRIC;
  return formatElevation(m);
}

/** Low and high in metres, one unit at the end: `4,003–8,839 ft`. */
export function formatElevationRange(lowM: number, highM: number): string {
  return `${groupInteger(toFeet(lowM))}–${groupInteger(toFeet(highM))} ${ELEVATION_UNIT}`;
}

const NO_CHART_VALUE = MISSING_METRIC;

/**
 * Wagmi price text. Idle passes `''`. That shows the trail's high point.
 * With no trail elevation to fall back on, it is an en dash.
 */
export function formatChartElevation({
  value,
  atRestMeters,
}: {
  value: string;
  atRestMeters?: number | null;
}): string {
  'worklet';
  if (value === '') {
    if (atRestMeters == null || Number.isNaN(atRestMeters)) return NO_CHART_VALUE;
    return formatElevation(atRestMeters);
  }
  const meters = Number(value);
  if (Number.isNaN(meters)) return NO_CHART_VALUE;
  return formatElevation(meters);
}

/**
 * Wagmi date text. The chart stores distance in meters on this channel.
 * Idle, and a falsy 0 that wagmi turns into -1, pass `-1` and show the
 * trail's full distance. With no distance to fall back on, it is an en dash.
 */
export function formatChartDistance({
  value,
  atRestMeters,
}: {
  value: number | string;
  atRestMeters?: number | null;
}): string {
  'worklet';
  const meters = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(meters) || meters < 0) {
    if (atRestMeters == null || Number.isNaN(atRestMeters)) return NO_CHART_VALUE;
    return formatDistance(atRestMeters / 1000);
  }
  return formatDistance(meters / 1000);
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function formatCompactDuration(totalSeconds: number | null): string {
  'worklet';
  if (totalSeconds == null) return MISSING_METRIC;
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mm}`;
  }
  return `${m}m`;
}

/** Opening-screen elevation in feet, e.g. `22,349 FT`. */
export function formatHeroElevation(elevationM: number): string {
  if (!Number.isFinite(elevationM)) return MISSING_METRIC;
  return `${Math.round(elevationM * FEET_PER_METRE).toLocaleString('en-US')} FT`;
}
