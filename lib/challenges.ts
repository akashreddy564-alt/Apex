/**
 * Monthly challenges: each month has a climb, a distance and a hikes
 * challenge. Only recorded hikes count, as on group boards (migration 031).
 * Pure, so it runs under node tests.
 */

export type ChallengeMetric = 'climb' | 'distance' | 'hikes';

export const CHALLENGE_METRICS: readonly ChallengeMetric[] = ['climb', 'distance', 'hikes'];

const FEET_PER_METRE = 3.28084;
const KM_PER_MILE = 1.609344;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface Challenge {
  /** "2026-12:climb", the server's key. */
  key: string;
  metric: ChallengeMetric;
  /** "December" */
  month: string;
  title: string;
  /** Stored units: metres for climb, kilometres for distance, a count for hikes. */
  target: number;
  /** First and last moment of the month, local time. */
  start: Date;
  end: Date;
}

/** Targets in stored units. 10,000 ft, 50 mi, 8 hikes. */
const TARGETS: Record<ChallengeMetric, number> = {
  climb: 10_000 / FEET_PER_METRE,
  distance: 50 * KM_PER_MILE,
  hikes: 8,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function challengeFor(metric: ChallengeMetric, at: Date = new Date()): Challenge {
  const start = new Date(at.getFullYear(), at.getMonth(), 1);
  const end = new Date(at.getFullYear(), at.getMonth() + 1, 1);
  const month = MONTHS[at.getMonth()]!;
  const title =
    metric === 'climb' ? `Climb 10,000 ft in ${month}` : metric === 'distance' ? `Hike 50 miles in ${month}` : `8 hikes in ${month}`;
  return {
    key: `${at.getFullYear()}-${pad(at.getMonth() + 1)}:${metric}`,
    metric,
    month,
    title,
    target: TARGETS[metric],
    start,
    end,
  };
}

export function monthChallenges(at: Date = new Date()): Challenge[] {
  return CHALLENGE_METRICS.map((metric) => challengeFor(metric, at));
}

/** Parses a server key; null when it isn't one. */
export function parseChallengeKey(key: string): Challenge | null {
  const match = /^(20\d{2})-(0[1-9]|1[0-2]):(climb|distance|hikes)$/.exec(key);
  if (!match) return null;
  return challengeFor(match[3] as ChallengeMetric, new Date(Number(match[1]), Number(match[2]) - 1, 15));
}

export interface ChallengeLog {
  created_at: string;
  recorded_path: unknown;
  distance_km?: number | null;
  elevation_gain_m?: number | null;
}

/** Your amount toward a challenge from the hikes on this phone, in stored units. */
export function challengeAmount(challenge: Challenge, logs: readonly ChallengeLog[]): number {
  const from = challenge.start.getTime();
  const to = challenge.end.getTime();
  let total = 0;
  for (const log of logs) {
    if (log.recorded_path == null) continue;
    const at = Date.parse(log.created_at);
    if (!Number.isFinite(at) || at < from || at >= to) continue;
    if (challenge.metric === 'hikes') total += 1;
    else {
      const value = challenge.metric === 'climb' ? log.elevation_gain_m : log.distance_km;
      if (value != null && Number.isFinite(value) && value > 0) total += value;
    }
  }
  return total;
}

/** 0–1, capped. */
export function challengeFraction(challenge: Challenge, amount: number): number {
  return challenge.target > 0 ? Math.max(0, Math.min(1, amount / challenge.target)) : 0;
}

/** "3,240 ft", "12.4 mi" or "3 hikes". */
export function formatChallengeAmount(metric: ChallengeMetric, amount: number): string {
  if (metric === 'climb') return `${Math.round(amount * FEET_PER_METRE).toLocaleString('en-US')} ft`;
  if (metric === 'distance') return `${(Math.round((amount / KM_PER_MILE) * 10) / 10).toFixed(1)} mi`;
  const n = Math.round(amount);
  return `${n} ${n === 1 ? 'hike' : 'hikes'}`;
}

/** "3,240 / 10,000 ft" */
export function formatChallengeProgress(challenge: Challenge, amount: number): string {
  if (challenge.metric === 'climb') {
    return `${Math.round(amount * FEET_PER_METRE).toLocaleString('en-US')} / 10,000 ft`;
  }
  if (challenge.metric === 'distance') return `${(amount / KM_PER_MILE).toFixed(1)} / 50 mi`;
  return `${Math.round(amount)} / 8 hikes`;
}

/** Days left in the month, counting today. */
export function daysLeft(challenge: Challenge, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.round((challenge.end.getTime() - today) / 86_400_000));
}

export interface ChallengeBoardRow {
  userId: string;
  username: string;
  displayName: string;
  amount: number;
  hikes: number;
  place: number;
  isMe: boolean;
}

export function mapChallengeRow(row: Record<string, unknown>): ChallengeBoardRow | null {
  if (typeof row.user_id !== 'string') return null;
  const amount = Number(row.amount);
  return {
    userId: row.user_id,
    username: typeof row.username === 'string' ? row.username : '',
    displayName: typeof row.display_name === 'string' ? row.display_name : '',
    amount: Number.isFinite(amount) ? amount : 0,
    hikes: Number.isFinite(Number(row.hikes)) ? Number(row.hikes) : 0,
    place: Number.isFinite(Number(row.place)) ? Number(row.place) : 0,
    isMe: row.is_me === true,
  };
}
