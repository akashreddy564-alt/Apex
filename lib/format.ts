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

export function formatDistanceKm(km: number): string {
  'worklet';
  return `${km.toFixed(1)} km`;
}

/** A missing distance is an en dash. Zero is only shown for a real zero. */
export function formatOptionalDistance(km: number | null): string {
  'worklet';
  if (km == null || Number.isNaN(km)) return MISSING_METRIC;
  return formatDistanceKm(km);
}

export function formatElevationM(m: number): string {
  'worklet';
  return `${groupInteger(m)} m`;
}

export function formatOptionalElevation(m: number | null): string {
  'worklet';
  if (m == null || Number.isNaN(m)) return MISSING_METRIC;
  return formatElevationM(m);
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
    return formatElevationM(atRestMeters);
  }
  const meters = Number(value);
  if (Number.isNaN(meters)) return NO_CHART_VALUE;
  return formatElevationM(meters);
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
    return formatDistanceKm(atRestMeters / 1000);
  }
  return formatDistanceKm(meters / 1000);
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
