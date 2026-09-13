export function formatDistanceKm(km: number): string {
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

export function formatElevationM(m: number): string {
  return `${Math.round(m).toLocaleString()} m`;
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
  if (totalSeconds == null) return '—';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}`;
  return `${m}m`;
}
