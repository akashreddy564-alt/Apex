/**
 * Weekly goal screen math: the drag dial, the Monday–Sunday bars and the pace
 * sentence. Pure, so it runs under node tests.
 */

import { formatAmount } from './weeklyGoal.ts';
import type { GoalLog, GoalMetric, GoalTrail } from './weeklyGoal.ts';
import { weekStart } from './streak.ts';

/** Display units: ft for elevation, mi for distance. */
export const DIAL_RANGE: Record<GoalMetric, { min: number; max: number; step: number }> = {
  elevation: { min: 1000, max: 8000, step: 250 },
  distance: { min: 5, max: 30, step: 1 },
};

export const DIAL_SWEEP_DEG = 260;
export const DIAL_START_DEG = -220;

/** Angle in `Math.atan2` degrees to a snapped, clamped display value. */
export function angleToDisplay(metric: GoalMetric, angleDeg: number): number {
  const { min, max, step } = DIAL_RANGE[metric];
  const rel = (((angleDeg - DIAL_START_DEG) % 360) + 360) % 360;
  // The gap past the sweep goes to whichever end is nearer.
  if (rel > DIAL_SWEEP_DEG) return rel < DIAL_SWEEP_DEG + (360 - DIAL_SWEEP_DEG) / 2 ? max : min;
  const raw = min + (rel / DIAL_SWEEP_DEG) * (max - min);
  const snapped = min + Math.round((raw - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

/** 0–1 position of a display value along the dial. */
export function displayToFraction(metric: GoalMetric, display: number): number {
  const { min, max } = DIAL_RANGE[metric];
  return Math.min(1, Math.max(0, (display - min) / (max - min)));
}

/** Stored-unit totals for Monday to Sunday of this week. */
export function dailyTotals(
  logs: readonly GoalLog[],
  trailOf: (id: string) => GoalTrail | undefined,
  metric: GoalMetric,
  now: Date = new Date(),
): number[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const start = weekStart(now).getTime();
  const nowMs = now.getTime();
  for (const log of logs) {
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at < start || at > nowMs) continue;
    // The hike's own numbers only, like the ring (weeklyProgress).
    const value = metric === 'distance' ? log.distance_km : log.elevation_gain_m;
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    totals[(new Date(at).getDay() + 6) % 7] += value;
  }
  return totals;
}

export function paceLine(
  metric: GoalMetric,
  doneStored: number,
  targetStored: number,
  now: Date = new Date(),
): { tone: 'good' | 'behind' | 'done'; text: string } {
  if (doneStored >= targetStored) return { tone: 'done', text: 'Goal met. Anything more is a bonus.' };
  const remaining = targetStored - doneStored;
  const unit = metric === 'elevation' ? 'ft' : 'mi';
  const togo = `${formatAmount(metric, remaining)} ${unit} to go`;
  if (remaining <= targetStored * 0.4) return { tone: 'good', text: `${togo}. One more good hike gets you there.` };
  const days = 7 - ((now.getDay() + 6) % 7);
  return { tone: 'behind', text: `${togo}, with ${days} ${days === 1 ? 'day' : 'days'} left this week.` };
}
