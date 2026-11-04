/** Pure rules for groups and leaderboards. Matches 012_groups.sql. */

export type GroupColor = 'bone' | 'green' | 'amber' | 'red' | 'blue' | 'slate';
export type Period = 'week' | 'month' | 'year';

export const GROUP_COLORS: GroupColor[] = ['bone', 'green', 'amber', 'red', 'blue', 'slate'];
export const PERIODS: Period[] = ['week', 'month', 'year'];
export const GROUP_NAME_MAX = 40;
export const GROUP_CAP = 50;
export const CODE_LENGTH = 6;

export interface Group {
  id: string;
  name: string;
  color: GroupColor;
  code: string;
  isOwner: boolean;
  memberCount: number;
  /** Your place by elevation gain this week. */
  place: number | null;
  /** Your place as of the start of today. Null on the week's first day. */
  previousPlace: number | null;
  weekGainM: number;
}

export interface BoardRow {
  userId: string;
  username: string;
  displayName: string;
  gainM: number;
  hikes: number;
  km: number;
  place: number;
  isMe: boolean;
  isOwner: boolean;
}

export interface GroupSummary {
  totalGainM: number;
  totalHikes: number;
  totalKm: number;
  topClimber: { name: string; gainM: number } | null;
  longestDay: { name: string; km: number } | null;
  favorite: { trailId: string; name: string; rankers: number } | null;
  tasteMatch: { name: string; percent: number } | null;
}

const num = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};
const optNum = (value: unknown): number | null => (value == null ? null : num(value));
const str = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export function isGroupColor(value: unknown): value is GroupColor {
  return typeof value === 'string' && (GROUP_COLORS as string[]).includes(value);
}

export function isPeriod(value: unknown): value is Period {
  return typeof value === 'string' && (PERIODS as string[]).includes(value);
}

/** Uppercase, letters and digits only, at most 6. "ab3-k9q" → "AB3K9Q". */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
}

/** Codes skip 0, O, 1 and I so they can't be misread. */
export function isCompleteCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code);
}

/** "AB3 K9Q": easier to read aloud. */
export function spacedCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}

export function mapGroup(row: Record<string, unknown>): Group | null {
  const id = str(row.id);
  const name = str(row.name);
  const code = str(row.code);
  if (!id || !name || !code) return null;
  return {
    id,
    name,
    color: isGroupColor(row.color) ? row.color : 'bone',
    code,
    isOwner: row.is_owner === true,
    memberCount: num(row.member_count),
    place: optNum(row.place),
    previousPlace: optNum(row.previous_place),
    weekGainM: num(row.week_gain_m),
  };
}

export function mapBoardRow(row: Record<string, unknown>): BoardRow | null {
  const userId = str(row.user_id);
  const username = str(row.username);
  if (!userId || !username) return null;
  return {
    userId,
    username,
    displayName: str(row.display_name) ?? username,
    gainM: num(row.gain_m),
    hikes: num(row.hikes),
    km: num(row.km),
    place: num(row.place),
    isMe: row.is_me === true,
    isOwner: row.is_owner === true,
  };
}

export function mapSummary(row: Record<string, unknown> | null | undefined): GroupSummary | null {
  if (!row) return null;
  const climber = str(row.top_climber);
  const longest = str(row.longest_day_name);
  const favoriteId = str(row.favorite_trail_id);
  const favoriteName = str(row.favorite_trail_name);
  const taste = str(row.taste_match_name);
  return {
    totalGainM: num(row.total_gain_m),
    totalHikes: num(row.total_hikes),
    totalKm: num(row.total_km),
    topClimber: climber ? { name: climber, gainM: num(row.top_climber_gain_m) } : null,
    longestDay: longest ? { name: longest, km: num(row.longest_day_km) } : null,
    favorite: favoriteId && favoriteName ? { trailId: favoriteId, name: favoriteName, rankers: num(row.favorite_rankers) } : null,
    tasteMatch: taste && row.taste_match_percent != null ? { name: taste, percent: num(row.taste_match_percent) } : null,
  };
}

/** Lower place number is better, so moving from 3rd to 2nd is 'up'. */
export function movement(place: number | null, previous: number | null): 'up' | 'down' | null {
  if (place == null || previous == null || place === previous) return null;
  return place < previous ? 'up' : 'down';
}

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

export function periodLabel(period: Period): string {
  return `this ${period}`;
}

/** Heights in meters, low to high. */
const LANDMARKS: [string, number][] = [
  ['the Statue of Liberty', 93],
  ['the Eiffel Tower', 330],
  ['the Empire State Building', 443],
  ['the Burj Khalifa', 828],
  ['Half Dome’s face', 1444],
  ['Mount Rainier', 4392],
  ['Kilimanjaro', 5895],
  ['Denali', 6190],
  ['Everest', 8849],
];
const EVEREST = 8849;

/** The playful line under "together this week". */
export function togetherLine(gainM: number): string {
  if (gainM <= 0) return 'Nobody has climbed yet.';
  if (gainM >= EVEREST * 2) return `${(gainM / EVEREST).toFixed(1)}× Everest`;
  let passed: string | null = null;
  for (const [name, height] of LANDMARKS) {
    if (gainM >= height) passed = name;
  }
  return passed ? `Higher than ${passed}` : `Most of the way up ${LANDMARKS[0][0]}`;
}

/** The phone's IANA time zone, which becomes a new group's. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
