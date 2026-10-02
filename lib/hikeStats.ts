export interface ClimbState {
  elevationGainM: number;
  elevationLossM: number;
  baseline: number | null;
}

/**
 * Count climb and descent from a smoothed altitude.
 * A change inside `threshold` meters is noise and does not move the baseline.
 */
export function applyAltitudeStep(
  state: ClimbState,
  smoothed: number | null,
  threshold = 3,
): ClimbState {
  if (smoothed == null || !Number.isFinite(smoothed)) return state;
  if (state.baseline == null) return { ...state, baseline: smoothed };
  const delta = smoothed - state.baseline;
  if (delta > threshold) {
    return {
      elevationGainM: state.elevationGainM + delta,
      elevationLossM: state.elevationLossM,
      baseline: smoothed,
    };
  }
  if (-delta > threshold) {
    return {
      elevationGainM: state.elevationGainM,
      elevationLossM: state.elevationLossM - delta,
      baseline: smoothed,
    };
  }
  return state;
}

/** Seconds per kilometre. Null until there is both distance and moving time. */
export function paceSecondsPerKm(distanceM: number, movingSeconds: number): number | null {
  if (!Number.isFinite(distanceM) || !Number.isFinite(movingSeconds)) return null;
  if (distanceM < 1 || movingSeconds < 1) return null;
  return (movingSeconds / distanceM) * 1000;
}

export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm)) return '—';
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function totalSeconds(startedAt: number, now: number): number {
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}
