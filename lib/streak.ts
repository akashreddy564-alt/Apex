/**
 * Weekly streak: consecutive Monday–Sunday weeks (local time) with at least
 * one hike. Weekly, not daily, so people who only hike on weekends aren't
 * punished. Pure, so it runs under node tests.
 */

export interface Streak {
  /** Weeks in a row, counting this week only once it has a hike. */
  weeks: number;
  hikedThisWeek: boolean;
  /** A streak that ends on Sunday night unless they hike. */
  atRisk: boolean;
}

const DAY_MS = 86_400_000;

/** Local midnight of the Monday that starts `date`'s week. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const sinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - sinceMonday);
  return start;
}

function weekKey(date: Date): number {
  const start = weekStart(date);
  // Days from a fixed Monday, divided into weeks. Rounding absorbs DST hours.
  return Math.round((start.getTime() - Date.UTC(2024, 0, 1)) / (7 * DAY_MS));
}

export function weeklyStreak(hikeDates: string[], now: Date = new Date()): Streak {
  const weeks = new Set<number>();
  const nowMs = now.getTime();
  for (const iso of hikeDates) {
    const at = Date.parse(iso);
    // Future-dated hikes don't count.
    if (Number.isFinite(at) && at <= nowMs) weeks.add(weekKey(new Date(at)));
  }
  const thisWeek = weekKey(now);
  const hikedThisWeek = weeks.has(thisWeek);
  let count = 0;
  for (let week = hikedThisWeek ? thisWeek : thisWeek - 1; weeks.has(week); week -= 1) count += 1;
  return { weeks: count, hikedThisWeek, atRisk: count > 0 && !hikedThisWeek };
}
