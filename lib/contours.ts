/**
 * Topographic contour rings: offset wavy loops around a point near the top
 * right, as drawn in the craft-pass mockup. Pure and deterministic, so a
 * given trail always gets the same texture.
 */

function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded PRNG returning [0, 1). */
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

const POINTS = 64;

/** SVG path strings, one closed ring each, for a width x height box. */
export function contourPaths(seed: string, width: number, height: number, rings = 12): string[] {
  const rand = mulberry32(hashString(seed));
  // The mockup's `seed` phase, 0 to 2 pi.
  const s = rand() * Math.PI * 2;
  const cx = width * 0.75;
  const cy = height * 0.25;
  const step = Math.max(width, height) / rings;
  const paths: string[] = [];
  for (let k = 1; k <= rings; k++) {
    const r = k * step * 0.62;
    const pts: string[] = [];
    for (let a = 0; a < POINTS; a++) {
      const t = (a / POINTS) * Math.PI * 2;
      const wob = 1 + 0.18 * Math.sin(3 * t + s + 0.6 * k) + 0.09 * Math.sin(5 * t - 1.3 * s + k);
      const x = cx + Math.cos(t) * r * wob * 1.25;
      const y = cy + Math.sin(t) * r * wob * 0.8;
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    paths.push(`M${pts.join(' L')}Z`);
  }
  return paths;
}
