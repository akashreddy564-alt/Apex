/**
 * What the Week ring home-screen widget shows, worked out on the phone.
 * The widget can't compute anything itself, so the app hands it a timeline:
 * now, and next Monday at midnight (an empty ring for the new week), so it
 * never shows last week's progress after the week turns over. Pure.
 */

import { weekStart, weeklyStreak } from './streak.ts';
import { formatAmount, weeklyProgress, type GoalLog, type WeeklyGoal } from './weeklyGoal.ts';

export interface WeekWidgetProps {
  /** "6.2" or "1,240". */
  done: string;
  /** "10" or "3,000". */
  target: string;
  unit: 'mi' | 'ft';
  /** 0–1. */
  fraction: number;
  /** Weeks in a row with a hike; 0 hides it. */
  streak: number;
  hikes: number;
  /** Whether the ring is the distance blue or climb brown. */
  metric: 'distance' | 'elevation';
}

export interface WidgetEntry {
  date: Date;
  props: WeekWidgetProps;
}

function propsAt(logs: readonly GoalLog[], goal: WeeklyGoal, now: Date): WeekWidgetProps {
  const progress = weeklyProgress(logs, () => undefined, goal, now);
  const streak = weeklyStreak(
    logs.map((l) => l.created_at),
    now,
  );
  return {
    done: formatAmount(goal.metric, progress.done),
    target: formatAmount(goal.metric, goal.target),
    unit: goal.metric === 'distance' ? 'mi' : 'ft',
    fraction: Math.round(progress.fraction * 1000) / 1000,
    streak: streak.weeks,
    hikes: progress.hikes,
    metric: goal.metric,
  };
}

/** The timeline: this week as it stands, then a fresh week from next Monday 00:00. */
export function weekWidgetTimeline(logs: readonly GoalLog[], goal: WeeklyGoal, now: Date = new Date()): WidgetEntry[] {
  const next = weekStart(now);
  next.setDate(next.getDate() + 7);
  return [
    { date: now, props: propsAt(logs, goal, now) },
    { date: next, props: propsAt(logs, goal, next) },
  ];
}
