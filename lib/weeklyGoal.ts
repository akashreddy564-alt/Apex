/**
 * Weekly goal ring: distance or elevation gain toward a target the hiker
 * picks, over the same Monday–Sunday local week as the streak. Personal only,
 * so past hikes dated this week count (leaderboards still use recorded hikes).
 * Targets are stored metric like the rest of the data and shown in mi / ft.
 * Pure, so it runs under node tests.
 */

import { weekStart } from "./streak.ts";

export type GoalMetric = "distance" | "elevation";

export interface WeeklyGoal {
  metric: GoalMetric;
  /** Kilometres for distance, metres for elevation. */
  target: number;
}

const FEET_PER_METRE = 3.28084;
const KM_PER_MILE = 1.609344;

/** Choices shown in display units. */
export const GOAL_PRESETS: Record<GoalMetric, readonly number[]> = {
  /** Feet. */
  elevation: [1000, 2000, 3000, 5000, 8000],
  /** Miles. */
  distance: [5, 10, 15, 25],
};

const DEFAULT_DISPLAY: Record<GoalMetric, number> = {
  elevation: 3000,
  distance: 10,
};

/** Display units (ft or mi) to stored units (m or km). */
export function toStored(metric: GoalMetric, display: number): number {
  return metric === "elevation"
    ? display / FEET_PER_METRE
    : display * KM_PER_MILE;
}

/** Stored units to display units, rounded to whole ft or 0.1 mi. */
export function toDisplay(metric: GoalMetric, stored: number): number {
  return metric === "elevation"
    ? Math.round(stored * FEET_PER_METRE)
    : Math.round((stored / KM_PER_MILE) * 10) / 10;
}

export function defaultGoal(metric: GoalMetric = "elevation"): WeeklyGoal {
  return { metric, target: toStored(metric, DEFAULT_DISPLAY[metric]) };
}

/** A stored goal from any build, reset to the default when it's broken. */
export function parseGoal(raw: unknown): WeeklyGoal {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const metric: GoalMetric =
    record.metric === "distance" ? "distance" : "elevation";
  const target =
    typeof record.target === "number" &&
    Number.isFinite(record.target) &&
    record.target > 0
      ? record.target
      : defaultGoal(metric).target;
  return { metric, target };
}

/** The fields a log or its trail can supply. Matches `HikeLog` and `Trail`. */
export interface GoalLog {
  trail_id: string;
  created_at: string;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
}

export interface GoalTrail {
  distance_km: number | null;
  elevation_gain_m: number | null;
}

export interface GoalProgress {
  /** Stored units, like `target`. */
  done: number;
  target: number;
  /** 0–1, for drawing the ring. */
  fraction: number;
  complete: boolean;
  /** Hikes this week, whether or not they had the metric. */
  hikes: number;
  /** Monday's local midnight, as a key for "already celebrated this week". */
  weekOf: string;
}

/**
 * Sum this week's hikes. A hike's own measurement wins; a hike without one
 * falls back to its trail's catalog figure, so past hikes still fill the ring.
 */
export function weeklyProgress(
  logs: readonly GoalLog[],
  trailOf: (id: string) => GoalTrail | undefined,
  goal: WeeklyGoal,
  now: Date = new Date(),
): GoalProgress {
  const start = weekStart(now).getTime();
  const nowMs = now.getTime();
  let done = 0;
  let hikes = 0;
  for (const log of logs) {
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at < start || at > nowMs) continue;
    hikes += 1;
    const trail = trailOf(log.trail_id);
    const value =
      goal.metric === "distance"
        ? (log.distance_km ?? trail?.distance_km)
        : (log.elevation_gain_m ?? trail?.elevation_gain_m);
    if (value != null && Number.isFinite(value) && value > 0) done += value;
  }
  const fraction = goal.target > 0 ? Math.min(1, done / goal.target) : 0;
  const monday = weekStart(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekOf = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  return {
    done,
    target: goal.target,
    fraction,
    complete: done >= goal.target,
    hikes,
    weekOf,
  };
}

/** "1,240 / 3,000 ft" or "4.2 / 10 mi". */
export function formatProgress(
  metric: GoalMetric,
  done: number,
  target: number,
): string {
  const unit = metric === "elevation" ? "ft" : "mi";
  return `${formatAmount(metric, done)} / ${formatAmount(metric, target)} ${unit}`;
}

/** Whole feet with commas, or miles to one decimal ("10" not "10.0"). */
export function formatAmount(metric: GoalMetric, stored: number): string {
  const value = toDisplay(metric, stored);
  if (metric === "distance")
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
