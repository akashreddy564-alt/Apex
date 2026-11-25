/**
 * Numbers for Home's dashboard: the "Your week" hero card and the top three
 * trails. Pure, so it runs under node tests.
 */

import { overallByScore } from './ranking.ts';
import { weeklyStreak, weekStart } from './streak.ts';
import { weeklyProgress, type GoalLog, type GoalMetric, type GoalTrail, type WeeklyGoal } from './weeklyGoal.ts';

export interface WeekCard {
  metric: GoalMetric;
  /** Stored units, like `target`: metres for elevation, kilometres for distance. */
  done: number;
  target: number;
  /** 0–100, rounded, capped at 100. */
  percent: number;
  hikes: number;
  /** This week's distance whatever the goal metric (a hike's own first, else its trail's). */
  distanceKm: number;
  streakWeeks: number;
}

export function weekCard(
  logs: readonly GoalLog[],
  trailOf: (id: string) => GoalTrail | undefined,
  goal: WeeklyGoal,
  now: Date = new Date(),
): WeekCard {
  const progress = weeklyProgress(logs, trailOf, goal, now);
  const start = weekStart(now).getTime();
  const nowMs = now.getTime();
  let distanceKm = 0;
  for (const log of logs) {
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at < start || at > nowMs) continue;
    const km = log.distance_km ?? trailOf(log.trail_id)?.distance_km;
    if (km != null && Number.isFinite(km) && km > 0) distanceKm += km;
  }
  return {
    metric: goal.metric,
    done: progress.done,
    target: progress.target,
    percent: Math.round(progress.fraction * 100),
    hikes: progress.hikes,
    distanceKm,
    streakWeeks: weeklyStreak(
      logs.map((log) => log.created_at),
      now,
    ).weeks,
  };
}

/** The best `n` rankings by score, best first. */
export function topTrails<T extends { trail_id: string; score: number; position: string }>(rankings: T[], n = 3): T[] {
  return overallByScore(rankings).slice(0, n);
}
