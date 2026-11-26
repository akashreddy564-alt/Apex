/**
 * Topographic contour lines, drawn the way a real topo map is: one smooth
 * height map (a main peak near the top right, two smaller hills, a little
 * rolling ground), then a line wherever that height crosses each level.
 * Lines at different levels of one surface can't cross, which the old
 * independently wobbling rings did. Pure and deterministic, so a given seed
 * always draws the same map.
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

interface Hill {
  x: number;
  y: number;
  sx: number;
  sy: number;
  height: number;
}

interface Wave {
  kx: number;
  ky: number;
  phase: number;
  amp: number;
}

/** The seeded height map over a width x height box. */
function heightMap(seed: string, width: number, height: number): (x: number, y: number) => number {
  const rand = mulberry32(hashString(seed));
  const size = Math.max(width, height);
  // Wider than tall, like the old rings, so the map reads as a landscape.
  const hills: Hill[] = [
    { x: width * (0.7 + rand() * 0.1), y: height * (0.2 + rand() * 0.1), sx: size * 0.42, sy: size * 0.3, height: 1 },
    {
      x: width * (0.1 + rand() * 0.3),
      y: height * (0.55 + rand() * 0.35),
      sx: size * (0.2 + rand() * 0.08),
      sy: size * (0.15 + rand() * 0.06),
      height: 0.45 + rand() * 0.15,
    },
    {
      x: width * (0.35 + rand() * 0.5),
      y: height * (0.6 + rand() * 0.4),
      sx: size * (0.14 + rand() * 0.06),
      sy: size * (0.12 + rand() * 0.05),
      height: 0.25 + rand() * 0.12,
    },
  ];
  const waves: Wave[] = Array.from({ length: 4 }, (_, i) => ({
    kx: ((1.5 + rand() * 2.5) * Math.PI * 2) / size,
    ky: ((1.5 + rand() * 2.5) * Math.PI * 2) / size,
    phase: rand() * Math.PI * 2,
    amp: 0.035 / (i + 1),
  }));
  return (x, y) => {
    let h = 0;
    for (const hill of hills) {
      const dx = (x - hill.x) / hill.sx;
      const dy = (y - hill.y) / hill.sy;
      h += hill.height * Math.exp(-(dx * dx + dy * dy));
    }
    for (const w of waves) h += w.amp * Math.sin(x * w.kx + w.phase) * Math.cos(y * w.ky - w.phase);
    return h;
  };
}

type Point = [number, number];

/**
 * SVG path data for a width x height box: one string per level (a level can
 * have several separate lines), lowest level first.
 */
export function contourPaths(seed: string, width: number, height: number, rings = 12): string[] {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const field = heightMap(seed, w, h);
  // About 45 cells across the short side: smooth lines, quick on a phone.
  const step = Math.max(3, Math.min(w, h) / 45);
  const nx = Math.ceil(w / step);
  const ny = Math.ceil(h / step);
  const xs = Array.from({ length: nx + 1 }, (_, i) => Math.min(w, i * step));
  const ys = Array.from({ length: ny + 1 }, (_, j) => Math.min(h, j * step));
  const grid: number[][] = ys.map((y) => xs.map((x) => field(x, y)));

  let lo = Infinity;
  let hi = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  const paths: string[] = [];
  for (let k = 1; k <= rings; k++) {
    // Nudged off any exact grid value so no corner sits on the line.
    const level = lo + ((hi - lo) * k) / (rings + 1) + 1e-9;
    paths.push(traceLevel(grid, xs, ys, level));
  }
  return paths;
}

/** Marching squares for one level, joined into polylines. */
function traceLevel(grid: number[][], xs: number[], ys: number[], level: number): string {
  const nx = xs.length - 1;
  const ny = ys.length - 1;
  // Each crossing point lives on one grid edge; its key joins the two cells that share it.
  const points = new Map<string, Point>();
  const links = new Map<string, string[]>();

  const edgePoint = (key: string, a: Point, va: number, b: Point, vb: number): string => {
    if (!points.has(key)) {
      const t = (level - va) / (vb - va);
      points.set(key, [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    return key;
  };
  const link = (a: string, b: string) => {
    if (!links.has(a)) links.set(a, []);
    if (!links.has(b)) links.set(b, []);
    links.get(a)!.push(b);
    links.get(b)!.push(a);
  };

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const tl = grid[j][i];
      const tr = grid[j][i + 1];
      const br = grid[j + 1][i + 1];
      const bl = grid[j + 1][i];
      const index = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (index === 0 || index === 15) continue;
      const pTL: Point = [xs[i], ys[j]];
      const pTR: Point = [xs[i + 1], ys[j]];
      const pBR: Point = [xs[i + 1], ys[j + 1]];
      const pBL: Point = [xs[i], ys[j + 1]];
      const top = () => edgePoint(`h${i},${j}`, pTL, tl, pTR, tr);
      const bottom = () => edgePoint(`h${i},${j + 1}`, pBL, bl, pBR, br);
      const left = () => edgePoint(`v${i},${j}`, pTL, tl, pBL, bl);
      const right = () => edgePoint(`v${i + 1},${j}`, pTR, tr, pBR, br);
      switch (index) {
        case 1:
        case 14:
          link(left(), bottom());
          break;
        case 2:
        case 13:
          link(bottom(), right());
          break;
        case 3:
        case 12:
          link(left(), right());
          break;
        case 4:
        case 11:
          link(top(), right());
          break;
        case 6:
        case 9:
          link(top(), bottom());
          break;
        case 7:
        case 8:
          link(left(), top());
          break;
        case 5:
        case 10: {
          // Saddle: the cell's centre decides which corners connect.
          const centre = (tl + tr + br + bl) / 4 > level;
          const topLeftHigh = index === 10;
          if (centre === topLeftHigh) {
            link(left(), bottom());
            link(top(), right());
          } else {
            link(left(), top());
            link(bottom(), right());
          }
          break;
        }
      }
    }
  }

  // Walk the links into lines: start at loose ends first, then the closed loops.
  const used = new Set<string>();
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const lines: string[] = [];
  const walk = (start: string) => {
    const chain = [start];
    let prev = '';
    let cur = start;
    for (;;) {
      const next = (links.get(cur) ?? []).find((n) => n !== prev && !used.has(edgeKey(cur, n)));
      if (next === undefined) break;
      used.add(edgeKey(cur, next));
      chain.push(next);
      prev = cur;
      cur = next;
      if (cur === start) break;
    }
    if (chain.length < 2) return;
    const closed = chain[chain.length - 1] === start && chain.length > 3;
    const pts = (closed ? chain.slice(0, -1) : chain).map((key) => {
      const [x, y] = points.get(key)!;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    lines.push(`M${pts.join(' L')}${closed ? 'Z' : ''}`);
  };
  for (const [key, next] of links) if (next.length === 1) walk(key);
  for (const [key, next] of links) {
    if (next.some((n) => !used.has(edgeKey(key, n)))) walk(key);
  }
  return lines.join(' ');
}
