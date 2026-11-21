/**
 * Odometer strip maths. A tile's strip is the digits 0-9 twice (20 entries).
 * `pos` is the strip index being shown; the digit is pos % 10.
 */

/** Move a position by a multiple of 10 into [5, 14], so any roll of up to 5 steps stays inside the strip. */
export function rebase(pos: number): { pos: number; shift: number } {
  const d = ((pos % 10) + 10) % 10;
  const next = d < 5 ? d + 10 : d;
  return { pos: next, shift: next - pos };
}

/** Shortest-direction roll to `digit`. `from` is the re-based start, `target` the strip index to land on. */
export function rollTo(pos: number, digit: number): { from: number; shift: number; target: number } {
  const { pos: from, shift } = rebase(pos);
  let delta = digit - (from % 10);
  if (delta > 5) delta -= 10;
  if (delta < -5) delta += 10;
  return { from, shift, target: from + delta };
}
