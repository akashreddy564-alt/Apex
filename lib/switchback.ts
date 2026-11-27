/**
 * Switchback, the daily trail puzzle. A square grid with numbered cairns:
 * draw one trail from cairn 1 that passes the cairns in order, steps only
 * up, down, left or right, covers every cell exactly once, and ends on the
 * last cairn. Everyone gets the same puzzle on a given day (seeded by the
 * date). Built by walking a random route through every cell first, so every
 * puzzle can be solved; any trail that follows the rules counts. Pure.
 */

export type Cell = number; // row * size + col

export interface Puzzle {
  /** "2026-11-27": the local day it's for. */
  date: string;
  size: number;
  /** Cell -> cairn number (1-based). */
  cairns: Record<number, number>;
  /** The number of the last cairn. */
  last: number;
}

/** Small, fast, seedable PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFor(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The local calendar day, "YYYY-MM-DD". */
export function dayKey(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Easier early in the week, bigger at the weekend. */
export function sizeFor(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(y!, m! - 1, d!).getDay(); // 0 Sunday
  return weekday === 0 || weekday === 6 ? 7 : weekday <= 2 ? 5 : 6;
}

export function neighbours(cell: Cell, size: number): Cell[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: Cell[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

export function adjacent(a: Cell, b: Cell, size: number): boolean {
  return neighbours(a, size).includes(b);
}

/**
 * A random route through every cell (a Hamiltonian path), by depth-first
 * search that tries the most cornered neighbour first (Warnsdorff), with
 * random tie-breaks. Fast on grids up to 7x7.
 */
export function randomRoute(size: number, random: () => number): Cell[] {
  const total = size * size;
  for (let attempt = 0; attempt < 50; attempt++) {
    const start = Math.floor(random() * total);
    const seen = new Uint8Array(total);
    const route: Cell[] = [start];
    seen[start] = 1;
    let steps = 0;
    const free = (cell: Cell) => neighbours(cell, size).filter((n) => !seen[n]).length;
    const walk = (cell: Cell): boolean => {
      if (route.length === total) return true;
      if (++steps > 20000) return false;
      const options = neighbours(cell, size)
        .filter((n) => !seen[n])
        .map((n) => ({ n, k: free(n), r: random() }))
        .sort((a, b) => a.k - b.k || a.r - b.r);
      for (const { n } of options) {
        seen[n] = 1;
        route.push(n);
        if (walk(n)) return true;
        route.pop();
        seen[n] = 0;
      }
      return false;
    };
    if (walk(start)) return route;
  }
  // Never reached in practice; a snake is always a valid route.
  return Array.from({ length: total }, (_, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    return r * size + (r % 2 === 0 ? c : size - 1 - c);
  });
}

/** Today's puzzle: the same for everyone on that date. */
export function puzzleFor(date: string): Puzzle {
  const random = rng(seedFor(`switchback:${date}`));
  const size = sizeFor(date);
  const route = randomRoute(size, random);
  const count = size + 2;
  // Cairns spread along the route: first and last cell, the rest evenly with a little wobble.
  const idx = new Set<number>([0, route.length - 1]);
  for (let i = 1; idx.size < count; i++) {
    const base = Math.round((i * (route.length - 1)) / (count - 1));
    const wobble = Math.round((random() - 0.5) * 2);
    const at = Math.min(route.length - 2, Math.max(1, base + wobble));
    idx.add(at);
    if (i > count * 4) break;
  }
  const ordered = [...idx].sort((a, b) => a - b);
  const cairns: Record<number, number> = {};
  ordered.forEach((at, i) => {
    cairns[route[at]!] = i + 1;
  });
  return { date, size, cairns, last: ordered.length };
}

/** The highest cairn reached along a trail so far (0 before cairn 1). */
export function reached(puzzle: Puzzle, trail: readonly Cell[]): number {
  let n = 0;
  for (const cell of trail) {
    const cairn = puzzle.cairns[cell];
    if (cairn != null) n = cairn;
  }
  return n;
}

/**
 * Whether the trail can step onto `cell` next. The first step must be cairn
 * 1; after that, a free neighbour of the trail's end, and a cairn only if
 * it's the next one (the last cairn only as the very last cell).
 */
export function canStep(puzzle: Puzzle, trail: readonly Cell[], cell: Cell): boolean {
  const total = puzzle.size * puzzle.size;
  if (cell < 0 || cell >= total) return false;
  if (trail.length === 0) return puzzle.cairns[cell] === 1;
  if (trail.includes(cell)) return false;
  if (!adjacent(trail[trail.length - 1]!, cell, puzzle.size)) return false;
  const cairn = puzzle.cairns[cell];
  if (cairn == null) return true;
  if (cairn !== reached(puzzle, trail) + 1) return false;
  return cairn !== puzzle.last || trail.length === total - 1;
}

/** Solved: every cell once, steps between neighbours, cairns in order, ending on the last. */
export function isSolved(puzzle: Puzzle, trail: readonly Cell[]): boolean {
  const total = puzzle.size * puzzle.size;
  if (trail.length !== total) return false;
  if (new Set(trail).size !== total) return false;
  if (puzzle.cairns[trail[0]!] !== 1 || puzzle.cairns[trail[total - 1]!] !== puzzle.last) return false;
  let next = 1;
  for (let i = 0; i < total; i++) {
    if (i > 0 && !adjacent(trail[i - 1]!, trail[i]!, puzzle.size)) return false;
    const cairn = puzzle.cairns[trail[i]!];
    if (cairn != null) {
      if (cairn !== next) return false;
      next += 1;
    }
  }
  return next === puzzle.last + 1;
}

/**
 * Touching a cell: extend to it, or, if it's already on the trail, step the
 * trail back to it (so dragging back over your trail undoes it).
 */
export function touch(puzzle: Puzzle, trail: readonly Cell[], cell: Cell): Cell[] {
  const at = trail.indexOf(cell);
  if (at >= 0) return trail.slice(0, at + 1);
  return canStep(puzzle, trail, cell) ? [...trail, cell] : [...trail];
}

/** "0:42" or "1:05". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface PuzzleStreak {
  /** Days in a row with a solve, ending today or yesterday. */
  current: number;
  best: number;
}

/** Streak from the set of solved days. A day missed breaks it; today not yet solved doesn't. */
export function streakFrom(solvedDays: readonly string[], today: string): PuzzleStreak {
  const days = new Set(solvedDays);
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
  // Longest run anywhere in the history.
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev && back(day) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return { current, best: Math.max(best, current) };
}
