/**
 * First Ascent: the first 100 accounts get a number, #001–#100, handed out by
 * the database in sign-up order (migration 021). Pure, so it runs under node tests.
 */

export const FIRST_ASCENT_LIMIT = 100;

/** "#007". Always three digits, so #100 and #001 line up. */
export function formatAscentNo(n: number): string {
  return `#${String(n).padStart(3, '0')}`;
}

/** The roster rows from `profiles`, as id → number. Ignores anything out of range. */
export function ascentRoster(rows: readonly { id?: unknown; ascent_no?: unknown }[]): Map<string, number> {
  const roster = new Map<string, number>();
  for (const row of rows) {
    const n = Number(row.ascent_no);
    if (typeof row.id === 'string' && Number.isInteger(n) && n >= 1 && n <= FIRST_ASCENT_LIMIT) {
      roster.set(row.id, n);
    }
  }
  return roster;
}

/** Spoken label: "First Ascent number 7". */
export function ascentA11yLabel(n: number): string {
  return `First Ascent number ${n}`;
}
