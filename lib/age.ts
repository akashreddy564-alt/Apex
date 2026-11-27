/** Apex is for people 13 and older (the terms say so; App Store age rating 13+). */
export const MIN_AGE = 13;
/** How far back the wheel goes. */
export const OLDEST_AGE = 100;

/**
 * Birth years on the wheel, oldest first, through this year. The wheel
 * doesn't stop at the cutoff, so it doesn't hint at the answer that gets in
 * (a neutral age screen); `oldEnough` decides.
 */
export function birthYears(currentYear: number): number[] {
  const first = currentYear - OLDEST_AGE;
  const last = currentYear;
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/**
 * Old enough by birth year. With only a year we can't know the birthday, so
 * the youngest year counts (they turn 13 sometime this year).
 */
export function oldEnough(birthYear: number, currentYear: number): boolean {
  return Number.isInteger(birthYear) && currentYear - birthYear >= MIN_AGE && currentYear - birthYear <= OLDEST_AGE;
}

/** Where the wheel starts: a typical user's year, so most people scroll a little. */
export function defaultBirthYear(currentYear: number): number {
  return currentYear - 25;
}

/** The row nearest a scroll offset, clamped to the list. */
export function indexAt(offset: number, rowHeight: number, count: number): number {
  if (count <= 0 || rowHeight <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offset / rowHeight)));
}
