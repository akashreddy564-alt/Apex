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

export type RecordingPhase = 'idle' | 'recording' | 'paused';

export type RecordingEvent = 'start' | 'pause' | 'resume' | 'stop';

/** Idle with no hike, recording while a fix can land, paused while the clock is held. */
export function recordingPhase(hike: { pausedAt: number | null } | null): RecordingPhase {
  if (!hike) return 'idle';
  return hike.pausedAt == null ? 'recording' : 'paused';
}

/** Illegal events leave the phase alone. Stop from either active phase returns to idle. */
export function nextRecordingPhase(phase: RecordingPhase, event: RecordingEvent): RecordingPhase {
  if (phase === 'idle') return event === 'start' ? 'recording' : 'idle';
  if (event === 'stop') return 'idle';
  if (phase === 'recording' && event === 'pause') return 'paused';
  if (phase === 'paused' && event === 'resume') return 'recording';
  return phase;
}

export function splitClock(
  startedAt: number,
  pausedMs: number,
  pausedAt: number | null,
  now: number,
): { total: number; paused: number; moving: number } {
  const total = totalSeconds(startedAt, now);
  const openPause = pausedAt == null ? 0 : Math.max(0, now - pausedAt);
  const paused = Math.max(0, Math.floor((pausedMs + openPause) / 1000));
  return { total, paused, moving: Math.max(0, total - paused) };
}

export interface RecordingClock {
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
}

/**
 * Apply one recording event. An illegal event returns the same hike.
 * Stop from recording or paused clears it. Start while one is open keeps it.
 */
export function applyRecordingEvent<T extends RecordingClock>(
  hike: T | null,
  event: RecordingEvent,
  now: number,
  create?: () => T,
): T | null {
  const phase = recordingPhase(hike);
  const next = nextRecordingPhase(phase, event);
  if (event === 'stop') return phase === 'idle' ? hike : null;
  if (next === phase) return hike;
  if (phase === 'idle' && next === 'recording') return create ? create() : hike;
  if (!hike) return hike;
  if (phase === 'recording' && next === 'paused') return { ...hike, pausedAt: now };
  if (phase === 'paused' && next === 'recording') {
    const pausedAt = hike.pausedAt ?? now;
    return {
      ...hike,
      pausedAt: null,
      pausedMs: hike.pausedMs + Math.max(0, now - pausedAt),
    };
  }
  return hike;
}
