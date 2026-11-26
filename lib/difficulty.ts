/**
 * The hiker's own difficulty rating for a trail, 1 Easy … 5 Very strenuous,
 * given with their ranking. Pure, so it runs under node tests.
 */

export const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Moderately strenuous', 'Strenuous', 'Very strenuous'] as const;
export type DifficultyLabel = (typeof DIFFICULTY_LABELS)[number];

export function difficultyLabel(value: number | null | undefined): DifficultyLabel | null {
  if (value == null || !Number.isInteger(value) || value < 1 || value > 5) return null;
  return DIFFICULTY_LABELS[value - 1];
}

/** The rating most people gave; a tie goes to the harder one. */
export function mostCommonDifficulty(values: readonly (number | null | undefined)[]): number | null {
  const counts = new Map<number, number>();
  for (const value of values) {
    if (difficultyLabel(value) == null) continue;
    counts.set(value as number, (counts.get(value as number) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount || (count === bestCount && best != null && value > best)) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
