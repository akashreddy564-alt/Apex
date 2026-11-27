/**
 * What the hike Live Activity shows, and when to push an update. Pure, so it
 * runs under node tests. iOS throttles Live Activity updates, so we only push
 * when the numbers change visibly or the clock pauses or resumes; the clock
 * itself ticks on the phone.
 */

import { splitClock } from './hikeStats.ts';

export interface ActivityHike {
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  distanceM: number;
  elevationGainM: number;
}

export interface ActivityProps {
  trail: string;
  miles: string;
  climbFt: string;
  clockFrom: number;
  paused: boolean;
  clockText: string;
}

const METRES_PER_MILE = 1609.344;
const FEET_PER_METRE = 3.28084;
/** At most one routine update this often. Pause and resume go out at once. */
export const MIN_UPDATE_MS = 15_000;

export function clockText(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

export function activityProps(hike: ActivityHike, trailName: string, now: number): ActivityProps {
  const moving = splitClock(hike.startedAt, hike.pausedMs, hike.pausedAt, now).moving;
  const name = trailName.trim() || 'Hike';
  return {
    trail: name.length > 32 ? `${name.slice(0, 31)}…` : name,
    miles: (Math.max(0, hike.distanceM) / METRES_PER_MILE).toFixed(2),
    climbFt: Math.round(Math.max(0, hike.elevationGainM) * FEET_PER_METRE).toLocaleString('en-US'),
    clockFrom: now - moving * 1000,
    paused: hike.pausedAt != null,
    clockText: clockText(moving),
  };
}

/** Whether `next` is worth pushing over what the Lock Screen already shows. */
export function shouldPush(shown: ActivityProps | null, next: ActivityProps, lastPushAt: number, now: number): boolean {
  if (!shown) return true;
  if (shown.paused !== next.paused || shown.trail !== next.trail) return true;
  if (shown.miles === next.miles && shown.climbFt === next.climbFt) return false;
  return now - lastPushAt >= MIN_UPDATE_MS;
}
