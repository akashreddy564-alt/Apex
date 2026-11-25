/**
 * "Your week in hiking": this Monday-to-Sunday week's hikes, climb, distance,
 * longest day and streak, for the share card. Pure, so it runs under node.
 */
import { weekStart, weeklyStreak } from './streak.ts';

export interface RecapLog {
  trail_id: string;
  created_at: string;
  duration_seconds?: number | null;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
}

export interface RecapTrail {
  name: string;
  distance_km: number | null;
  elevation_gain_m: number | null;
}

export interface WeekRecap {
  /** "Nov 17 – 23" or "Nov 28 – Dec 4". */
  range: string;
  hikes: number;
  gainM: number;
  km: number;
  movingSeconds: number;
  /** The hike that climbed the most, with its climb. */
  biggest: { name: string; gainM: number } | null;
  /** Distinct trails this week, in the order first hiked. */
  trails: string[];
  streakWeeks: number;
  /** Climb per day, Monday first, for the little bar row. */
  days: number[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekRange(now: Date): string {
  const start = weekStart(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const from = `${MONTHS[start.getMonth()]} ${start.getDate()}`;
  const to = end.getMonth() === start.getMonth() ? `${end.getDate()}` : `${MONTHS[end.getMonth()]} ${end.getDate()}`;
  return `${from} – ${to}`;
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function weekRecap(
  logs: readonly RecapLog[],
  trailOf: (id: string) => RecapTrail | undefined,
  now: Date = new Date(),
): WeekRecap {
  const start = weekStart(now).getTime();
  const nowMs = now.getTime();
  const days = [0, 0, 0, 0, 0, 0, 0];
  const trails: string[] = [];
  let hikes = 0;
  let gainM = 0;
  let km = 0;
  let movingSeconds = 0;
  let biggest: WeekRecap['biggest'] = null;

  const sorted = [...logs].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  for (const log of sorted) {
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at < start || at > nowMs) continue;
    const trail = trailOf(log.trail_id);
    // The hike's own numbers only: catalog figures are guesses for most trails.
    const gain = positive(log.elevation_gain_m) ?? 0;
    const dist = positive(log.distance_km) ?? 0;
    hikes += 1;
    gainM += gain;
    km += dist;
    movingSeconds += positive(log.duration_seconds) ?? 0;
    const day = (new Date(at).getDay() + 6) % 7;
    days[day] += gain;
    const name = trail?.name ?? 'A hike';
    if (!trails.includes(name)) trails.push(name);
    if (gain > 0 && (!biggest || gain > biggest.gainM)) biggest = { name, gainM: gain };
  }

  return {
    range: weekRange(now),
    hikes,
    gainM: Math.round(gainM),
    km: Math.round(km * 10) / 10,
    movingSeconds,
    biggest: biggest ? { name: biggest.name, gainM: Math.round(biggest.gainM) } : null,
    trails,
    streakWeeks: weeklyStreak(logs.map((log) => log.created_at), now).weeks,
    days: days.map(Math.round),
  };
}

/** The line shared with the image. */
export function recapMessage(recap: WeekRecap, elevation: (m: number) => string, distance: (km: number) => string): string {
  if (recap.hikes === 0) return `My week in hiking (${recap.range}): rest week. Back on the trail soon.`;
  const parts = [
    `${recap.hikes} ${recap.hikes === 1 ? 'hike' : 'hikes'}`,
    `${elevation(recap.gainM)} climbed`,
    distance(recap.km),
  ];
  const streak = recap.streakWeeks > 1 ? ` ${recap.streakWeeks}-week streak.` : '';
  return `My week in hiking (${recap.range}): ${parts.join(', ')}.${streak} Tracked with Apex.`;
}
