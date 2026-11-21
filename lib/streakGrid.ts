/**
 * 12-week dot grid for the Log tab: one cell per day, weeks oldest to newest,
 * days Monday to Sunday (local time). Level 0 is no hike, 1 a hike, 2 a full
 * hike. Pure, so it runs under node tests.
 */

import { weekStart } from './streak.ts';
import type { GoalLog, GoalTrail } from './weeklyGoal.ts';

export type DayLevel = 0 | 1 | 2;

/** A hike this big (about 1,000 ft or 5 mi) fills the dot. */
export const FULL_HIKE = { gainM: 305, distanceKm: 8.05 };

const WEEK_MS = 7 * 86_400_000;

function levelOf(log: GoalLog, trail: GoalTrail | undefined): DayLevel {
  const gain = log.elevation_gain_m ?? trail?.elevation_gain_m;
  const distance = log.distance_km ?? trail?.distance_km;
  if (gain != null && Number.isFinite(gain) && gain >= FULL_HIKE.gainM) return 2;
  if (distance != null && Number.isFinite(distance) && distance >= FULL_HIKE.distanceKm) return 2;
  return 1;
}

export function streakGrid(
  logs: readonly GoalLog[],
  trailOf: (id: string) => GoalTrail | undefined,
  now: Date = new Date(),
  weeks = 12,
): DayLevel[][] {
  const grid: DayLevel[][] = Array.from({ length: weeks }, () => [0, 0, 0, 0, 0, 0, 0] as DayLevel[]);
  const thisWeek = weekStart(now).getTime();
  const nowMs = now.getTime();
  for (const log of logs) {
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at > nowMs) continue;
    const date = new Date(at);
    // Rounding absorbs DST hours between two local Mondays.
    const back = Math.round((thisWeek - weekStart(date).getTime()) / WEEK_MS);
    if (back < 0 || back >= weeks) continue;
    const day = (date.getDay() + 6) % 7;
    const level = levelOf(log, trailOf(log.trail_id));
    const row = grid[weeks - 1 - back];
    if (level > row[day]) row[day] = level;
  }
  return grid;
}
