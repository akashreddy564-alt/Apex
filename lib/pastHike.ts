import { MOCK_USER_ID } from '@/data/mockTrails';
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

/**
 * A starting hike type from distance and gain. The hiker can override it.
 * 8.9 km and 520 m is a day hike. A long day is backpacking. A big climb is a summit.
 */
export function suggestHikeType(distanceKm: number, gainM: number): string {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(gainM)) return 'Day Hike';
  if (distanceKm >= 20) return 'Backpacking';
  if (gainM >= 800) return 'Summit';
  if (distanceKm < 5 && gainM < 200) return 'Walk';
  return 'Day Hike';
}

export function durationFromParts(hours: number, minutes: number): number {
  const h = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const m = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return h * 3600 + m * 60;
}

/** Noon local time so the stored day does not shift across UTC. */
export function hikeTimestamp(date: Date): string {
  const day = localDay(date);
  day.setHours(12, 0, 0, 0);
  return day.toISOString();
}

export function buildPastHikeLog(draft: PastHikeDraft): HikeLog | null {
  if (!draft.trailId) return null;
  if (isFutureDay(draft.hikedOn, draft.now ?? new Date())) return null;
  const notes = (draft.notes ?? '').trim();
  const distance = draft.distanceKm;
  return {
    id: draft.id ?? `log-${Date.now()}`,
    user_id: draft.userId ?? MOCK_USER_ID,
    trail_id: draft.trailId,
    duration_seconds: durationFromParts(draft.hours ?? 0, draft.minutes ?? 0),
    photos: draft.photos ?? [],
    notes: notes.length > 0 ? notes : null,
    recorded_path: null,
    created_at: hikeTimestamp(draft.hikedOn),
    distance_km: distance == null || !Number.isFinite(distance) ? null : distance,
    terrain: draft.terrain ?? [],
    conditions: draft.conditions ?? [],
    difficulty: draft.difficulty ?? null,
    hike_type: draft.hikeType ?? null,
  };
}
