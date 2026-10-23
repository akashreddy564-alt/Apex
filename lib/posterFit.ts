/**
 * Anton 400 advance widths in em, read from the bundled font. Unknown glyphs
 * count as 0.5 em, slightly wider than most capitals.
 */
const ANTON_EM: Record<string, number> = {
  A: 0.4854, B: 0.4785, C: 0.4741, D: 0.4932, E: 0.4116, F: 0.3989, G: 0.4849,
  H: 0.499, I: 0.2266, J: 0.4663, K: 0.4722, L: 0.3975, M: 0.7461, N: 0.498,
  O: 0.4863, P: 0.4722, Q: 0.4937, R: 0.4766, S: 0.4614, T: 0.3955, U: 0.4736,
  V: 0.4692, W: 0.7119, X: 0.4839, Y: 0.4463, Z: 0.4102, '0': 0.4941,
  '1': 0.3306, '2': 0.4941, '3': 0.4941, '4': 0.4941, '5': 0.4941, '6': 0.4941,
  '7': 0.4941, '8': 0.4941, '9': 0.4941, ' ': 0.2344, '-': 0.311, "'": 0.2139,
  '’': 0.2319, '.': 0.2285, ',': 0.2363,
};

const MAX_SIZE = 84;
/** Room for kerning and rendering differences. */
const SAFETY = 0.96;

export function posterLineEm(line: string): number {
  let em = 0;
  for (const ch of line) em += ANTON_EM[ch] ?? 0.5;
  return em;
}

/**
 * Splits an uppercase name into one or two lines, only between words, and
 * picks the largest Anton size (up to 84 pt) at which every line fits.
 */
export function posterLayout(name: string, maxWidth: number): { lines: string[]; fontSize: number } {
  const words = name.trim().split(/\s+/);
  const sizeFor = (lines: string[]) =>
    Math.min(MAX_SIZE, Math.floor((maxWidth * SAFETY) / Math.max(...lines.map(posterLineEm))));
  let best = { lines: [words.join(' ')], fontSize: sizeFor([words.join(' ')]) };
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const fontSize = sizeFor(lines);
    if (fontSize > best.fontSize) best = { lines, fontSize };
  }
  return best;
}

/**
 * Trail-card title: one line up to `max` pt, shrinking to `min`; below that,
 * two lines split between words, capped a little smaller.
 */
export function cardTitleLayout(
  name: string,
  maxWidth: number,
  max = 30,
  min = 22,
): { lines: string[]; fontSize: number } {
  const fit = (lines: string[]) =>
    Math.floor((maxWidth * SAFETY) / Math.max(...lines.map(posterLineEm)));
  const single = name.trim().replace(/\s+/g, ' ');
  const oneLine = Math.min(max, fit([single]));
  if (oneLine >= min) return { lines: [single], fontSize: oneLine };
  const words = single.split(' ');
  let best = { lines: [single], fontSize: oneLine };
  for (let i = 1; i < words.length; i += 1) {
    const lines = [words.slice(0, i).join(' '), words.slice(i).join(' ')];
    const size = Math.min(max - 4, fit(lines));
    if (size > best.fontSize) best = { lines, fontSize: size };
  }
  return best;
}

/** iOS clips Anton glyphs when a line box is shorter than about 1.1 em. */
const SAFE_LINE = 1.12;

/**
 * Line height and top margin for line `index` of a stacked poster name:
 * each line keeps a box iOS won't clip, and later lines are pulled up so the
 * lines still sit `visual` em apart.
 */
export function posterLineStyle(
  fontSize: number,
  index: number,
  visual = 0.92,
): { lineHeight: number; marginTop: number } {
  const lineHeight = Math.round(fontSize * SAFE_LINE);
  const marginTop = index === 0 ? 0 : Math.round(fontSize * visual) - lineHeight;
  return { lineHeight, marginTop };
}
