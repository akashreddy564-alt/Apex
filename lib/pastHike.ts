import { MOCK_USER_ID } from '@/data/mockTrails';
import { DEFAULT_HIKE_TYPE } from '@/lib/ranking';
import { LIMITS, sanitizeOptional } from '@/lib/sanitize';
import type { HikeLog } from '@/types/trail';

export interface PastHikeDraft {
  trailId: string;
  hikedOn: Date;
  hours?: number;
  minutes?: number;
  notes?: string;
  /** Kilometres. Null when the hiker left it blank. */
  distanceKm?: number | null;
  terrain?: string[];
  conditions?: string[];
  difficulty?: string | null;
  hikeType?: string | null;
  photos?: string[];
  /** The trail's climb, copied so the week's elevation counts it. Metres. */
  elevationGainM?: number | null;
  userId?: string;
  id?: string;
  /** Clock used to reject a future day. Defaults to now. */
  now?: Date;
}

export function localDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isFutureDay(date: Date, now: Date = new Date()): boolean {
  return localDay(date).getTime() > localDay(now).getTime();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** "Sun, Sep 27, 2026". Fixed English labels so the sheet does not depend on locale. */
export function formatHikeDay(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** The ranking list this hike belongs to. Distance does not invent a second type set. */
export function suggestHikeType(_distanceKm: number, _gainM: number): string {
  return DEFAULT_HIKE_TYPE;
}

export function durationFromParts(hours: number, minutes: number): number {
  const h = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const m = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return h * 3600 + m * 60;
}

/**
 * Noon local time so the stored day does not shift across UTC. A hike logged
 * for today must not land in the future (weekly totals skip future logs), so
 * today's stamp is the earlier of noon and when the hike would have started.
 */
export function hikeTimestamp(date: Date, now: Date = new Date(), durationSeconds = 0): string {
  const day = localDay(date);
  day.setHours(12, 0, 0, 0);
  if (localDay(date).getTime() === localDay(now).getTime()) {
    const started = now.getTime() - Math.max(0, durationSeconds) * 1000;
    // Never earlier than midnight, so the hike stays on the chosen day.
    const stamp = Math.max(localDay(now).getTime(), Math.min(day.getTime(), started));
    return new Date(stamp).toISOString();
  }
  return day.toISOString();
}

export function buildPastHikeLog(draft: PastHikeDraft): HikeLog | null {
  if (!draft.trailId) return null;
  if (isFutureDay(draft.hikedOn, draft.now ?? new Date())) return null;
  const notes = sanitizeOptional(draft.notes, LIMITS.notes) ?? '';
  const distance = draft.distanceKm;
  const duration = durationFromParts(draft.hours ?? 0, draft.minutes ?? 0);
  const gain = draft.elevationGainM;
  return {
    id: draft.id ?? `log-${Date.now()}`,
    user_id: draft.userId ?? MOCK_USER_ID,
    trail_id: draft.trailId,
    duration_seconds: duration,
    photos: draft.photos ?? [],
    notes: notes.length > 0 ? notes : null,
    recorded_path: null,
    created_at: hikeTimestamp(draft.hikedOn, draft.now ?? new Date(), duration),
    distance_km: distance == null || !Number.isFinite(distance) ? null : distance,
    terrain: draft.terrain ?? [],
    conditions: draft.conditions ?? [],
    difficulty: draft.difficulty ?? null,
    hike_type: draft.hikeType ?? null,
    elevation_gain_m: gain == null || !Number.isFinite(gain) ? null : Math.round(gain),
  };
}
