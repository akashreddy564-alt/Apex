/**
 * Summit, the daily mountain guess. One famous peak or trail a day (the
 * same for everyone), shown as a zoomed-in, blurred photo. Each wrong guess
 * says how far off it was (higher or lower, how many miles, which way) and
 * reveals more of the photo. Six guesses. Pure.
 */

export const MAX_GUESSES = 6;

export interface SummitPlace {
  id: string;
  name: string;
  elevationM: number;
  region: string;
  country: string;
}

/** Summit or route high point, as [lat, lon]. Approximate to a few hundred metres. */
export const PLACE_COORDS: Record<string, readonly [number, number]> = {
  'ama-dablam': [27.8617, 86.8614],
  'half-dome': [37.7459, -119.5332],
  'angels-landing': [37.2692, -112.9479],
  'kalalau-trail': [22.17, -159.65],
  'mount-whitney': [36.5785, -118.2923],
  denali: [63.0692, -151.007],
  'dawn-wall': [37.734, -119.6377],
  'longs-peak': [40.255, -105.6151],
  'mount-rainier': [46.8523, -121.7603],
  k2: [35.8825, 76.5133],
  'mount-everest': [27.9881, 86.925],
  'eiger-north-face': [46.5776, 8.0053],
  matterhorn: [45.9763, 7.6586],
  'huayna-picchu': [-13.1547, -72.5463],
  'annapurna-circuit': [28.7953, 83.9381],
  'torres-del-paine': [-50.9423, -73.4068],
  'cerro-torre': [-49.293, -73.098],
  'fitz-roy': [-49.2714, -73.0431],
  'tour-du-mont-blanc': [45.8326, 6.8652],
  trolltunga: [60.124, 6.74],
  'mount-hua': [34.4833, 110.0833],
  kilimanjaro: [-3.0674, 37.3556],
  aconcagua: [-32.6532, -70.0109],
};

/** The local calendar day, "YYYY-MM-DD". */
export function dayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Whole days since 2026-01-01 for a "YYYY-MM-DD" key (calendar days, no time zones). */
export function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round((Date.UTC(y!, m! - 1, d!) - Date.UTC(2026, 0, 1)) / 86_400_000);
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Today's place. The list is shuffled once per pass (seeded by the pass
 * number), so every place comes up once before any repeats, and passes
 * don't follow the same order.
 */
export function placeFor<T extends { id: string }>(day: string, places: readonly T[]): T {
  const n = places.length;
  const index = dayNumber(day);
  const pass = Math.floor(index / n);
  const order = [...places].sort((a, b) => a.id.localeCompare(b.id));
  const random = mulberry32(pass * 7919 + 17);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order[((index % n) + n) % n]!;
}

/** "#7": the puzzle's number, counting from the first day. */
export function puzzleNumber(day: string): number {
  return dayNumber(day) + 1;
}

const R_MILES = 3958.8;

export function milesBetween(a: readonly [number, number], b: readonly [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Compass bearing in degrees (0 = north), from a toward b. */
export function bearing(a: readonly [number, number], b: readonly [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0]));
  const x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type CompassPoint = (typeof POINTS)[number];

export function compassPoint(degrees: number): CompassPoint {
  return POINTS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]!;
}

export interface GuessHint {
  correct: boolean;
  /** Feet higher (+) or lower (-) the answer is than your guess. */
  elevationFt: number;
  miles: number;
  /** Which way to go from your guess to reach the answer. */
  direction: CompassPoint;
  sameCountry: boolean;
}

const FEET_PER_M = 3.28084;

export function hintFor(guess: SummitPlace, answer: SummitPlace): GuessHint {
  const from = PLACE_COORDS[guess.id];
  const to = PLACE_COORDS[answer.id];
  const miles = from && to ? milesBetween(from, to) : 0;
  return {
    correct: guess.id === answer.id,
    elevationFt: Math.round((answer.elevationM - guess.elevationM) * FEET_PER_M),
    miles: Math.round(miles),
    direction: from && to ? compassPoint(bearing(from, to)) : 'N',
    sameCountry: guess.country === answer.country,
  };
}

/** How much of the photo shows after this many wrong guesses: zoom and blur ease off each time. */
export function reveal(wrong: number, finished: boolean): { scale: number; blur: number } {
  if (finished) return { scale: 1, blur: 0 };
  const steps = [
    // The first look is a close-up with texture you can read, not a smear.
    { scale: 2.6, blur: 10 },
    { scale: 2.2, blur: 7 },
    { scale: 1.85, blur: 5 },
    { scale: 1.5, blur: 3 },
    { scale: 1.25, blur: 1.5 },
    { scale: 1.1, blur: 0 },
  ];
  return steps[Math.min(wrong, steps.length - 1)]!;
}

export type GameState = 'playing' | 'won' | 'lost';

export function stateOf(guesses: readonly string[], answerId: string): GameState {
  if (guesses.includes(answerId)) return 'won';
  return guesses.length >= MAX_GUESSES ? 'lost' : 'playing';
}

/** A spoiler-free line to share: "Summit #331 · 3/6" (or X/6). */
export function shareLine(day: string, guesses: readonly string[], answerId: string): string {
  const state = stateOf(guesses, answerId);
  const score = state === 'won' ? String(guesses.indexOf(answerId) + 1) : 'X';
  return `Summit #${puzzleNumber(day)} · ${score}/${MAX_GUESSES}`;
}

export interface DailyStreak {
  current: number;
  best: number;
}

/** Days in a row with a win, ending today or yesterday; and the longest run. */
export function streakFrom(wonDays: readonly string[], today: string): DailyStreak {
  const days = new Set(wonDays);
  const back = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return dayKey(new Date(y!, m! - 1, d! - 1));
  };
  let cursor = days.has(today) ? today : back(today);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = back(cursor);
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...days].sort()) {
    run = prev && back(day) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best: Math.max(best, current) };
}
