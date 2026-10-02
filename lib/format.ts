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

export function formatElevationM(m: number): string {
  'worklet';
  return `${groupInteger(m)} m`;
}

/**
 * Wagmi price text. Runs on the UI runtime, so this is a worklet and
 * closes over nothing but the elevation string.
 */
export function formatChartElevation({ value }: { value: string }): string {
  'worklet';
  const meters = Number(value);
  if (Number.isNaN(meters)) return '—';
  return formatElevationM(meters);
}

/**
 * Wagmi date text. The chart stores distance along the trail in this channel.
 */
export function formatChartDistance({ value }: { value: number | string }): string {
  'worklet';
  const meters = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(meters)) return '—';
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
  if (totalSeconds == null) return '—';
  const safe = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mm}`;
  }
  return `${m}m`;
}
