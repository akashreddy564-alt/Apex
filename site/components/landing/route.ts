import type { Trail } from "@/lib/trails";

/** Projects a trail's [lng, lat] line into an SVG box, keeping its true shape. */
export function routePath(trail: Trail, size = 400, pad = 24) {
  const lat0 = trail.path[0][1];
  const k = Math.cos((lat0 * Math.PI) / 180);
  const pts = trail.path.map(([lng, lat]) => [lng * k, -lat] as const);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
  const scale = (size - pad * 2) / span;
  const offX = (size - (Math.max(...xs) - minX) * scale) / 2;
  const offY = (size - (Math.max(...ys) - minY) * scale) / 2;
  const xy = pts.map(([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return { d, points: xy };
}

/** Elevation at a distance along the trail, in feet. */
export function feetAt(trail: Trail, miles: number) {
  const p = trail.profile;
  if (miles <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (p[i][0] >= miles) {
      const [m0, f0] = p[i - 1];
      const [m1, f1] = p[i];
      return f0 + ((f1 - f0) * (miles - m0)) / (m1 - m0 || 1);
    }
  }
  return p[p.length - 1][1];
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
