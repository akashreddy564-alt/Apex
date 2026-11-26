/**
 * Taste match: how often two people put their shared trails in the same order.
 * Mirrors `taste_match` in migration 028.
 */

/** Below this many shared trails, the number would mean too little to show. */
export const MIN_SHARED = 4;
/** Agreement at or above this counts as "your taste". */
export const TASTE_THRESHOLD = 70;

/**
 * Of every pair of trails both people ranked, the percentage both ordered the
 * same way. Pairs either person tied are skipped. Agreement is null below
 * MIN_SHARED trails or when no pair is untied.
 */
export function agreement(a: Map<string, number>, b: Map<string, number>): { shared: number; agreement: number | null } {
  const shared = [...a.keys()].filter((id) => b.has(id));
  if (shared.length < MIN_SHARED) return { shared: shared.length, agreement: null };
  let same = 0;
  let total = 0;
  for (let i = 0; i < shared.length; i += 1) {
    for (let j = i + 1; j < shared.length; j += 1) {
      const x = Math.sign(a.get(shared[i])! - a.get(shared[j])!);
      const y = Math.sign(b.get(shared[i])! - b.get(shared[j])!);
      if (x === 0 || y === 0) continue;
      total += 1;
      if (x === y) same += 1;
    }
  }
  return { shared: shared.length, agreement: total === 0 ? null : Math.round((same / total) * 100) };
}
