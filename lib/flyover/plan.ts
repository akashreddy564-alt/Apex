/**
 * The route flyover's script: an even, smoothed route and one cue per video
 * frame. The page in the WebView only moves the camera and draws; every
 * timing decision is made here so it can be tested.
 * Pure, so node tests can run it (no `@/` imports).
 */

/** [lon, lat] or [lon, lat, elevation m], as GeoJSON stores them. */
export type Coord = [number, number] | [number, number, number] | number[];

export interface FlyoverStats {
  name: string;
  distanceKm: number;
  gainM: number;
  durationSeconds: number;
}

/** One frame of the flyover. */
export interface Cue {
  /** How much of the route is drawn, 0 to 1 of its length. */
  a: number;
  /** Turn around the high point, 0 to 1, or -1 when not orbiting. */
  o: number;
  /** Pull back to the whole route, 0 to 1, or -1 before it starts. */
  p: number;
  /** Counted-up stats at this frame. */
  km: number;
  gain: number;
  secs: number;
}

export interface FlyoverPlan {
  /** [lon, lat, elevation m or null], evenly spaced along the route. */
  points: [number, number, number | null][];
  /** Each point's distance from the start, 0 to 1. */
  along: number[];
  /** Index of the high point, or -1 without elevations. */
  peak: number;
  /** [fraction along, steepness 0–1] stops; the glow brightens where it's steep. */
  steep: [number, number][];
  /** Route length in metres. */
  lengthM: number;
  fps: number;
  cues: Cue[];
  stats: FlyoverStats;
  /** [[west, south], [east, north]]. */
  bounds: [[number, number], [number, number]];
}

export const FPS = 30;
/** Matches trim_route() in 011: shared routes lose their first and last 300 m. */
export const PRIVATE_ENDS_M = 300;
const SPACING_M = 20;
const MAX_POINTS = 600;
const MIN_POINTS = 40;
const ORBIT_MS = 3000;
const PULL_MS = 2400;
const HOLD_MS = 1400;

function metres(a: Coord, b: Coord): number {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r;
  const dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function usable(coords: Coord[]): Coord[] {
  return coords.filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
}

function cumulative(coords: Coord[]): number[] {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + metres(coords[i - 1], coords[i]));
  return out;
}

function elevationOf(c: Coord): number | null {
  return c.length > 2 && Number.isFinite(c[2]) ? (c[2] as number) : null;
}

/** The point `d` metres along the route, elevation included when both ends have one. */
function pointAt(coords: Coord[], cum: number[], d: number): [number, number, number | null] {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const span = cum[i] - cum[i - 1];
  const t = span > 0 ? Math.min(1, Math.max(0, (d - cum[i - 1]) / span)) : 0;
  const a = coords[i - 1];
  const b = coords[i];
  const ea = elevationOf(a);
  const eb = elevationOf(b);
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    ea !== null && eb !== null ? ea + (eb - ea) * t : null,
  ];
}

/**
 * The route without its first and last `meters`, for anything other people
 * see. Null when it's too short to trim (the same rule as the server).
 */
export function trimEnds(coords: Coord[], meters = PRIVATE_ENDS_M): Coord[] | null {
  const line = usable(coords);
  if (line.length < 2) return null;
  const cum = cumulative(line);
  const total = cum[cum.length - 1];
  if (total <= meters * 2 + 100) return null;
  const end = total - meters;
  const inside = line.filter((_, i) => cum[i] > meters && cum[i] < end);
  return [pointAt(line, cum, meters), ...inside, pointAt(line, cum, end)].map((p) =>
    p.length > 2 && p[2] !== null && p[2] !== undefined ? [p[0], p[1], p[2] as number] : [p[0], p[1]],
  );
}

/** Evenly spaced points with a light moving average, so GPS jitter doesn't shake the camera. */
function resample(coords: Coord[]): { points: [number, number, number | null][]; lengthM: number } {
  const cum = cumulative(coords);
  const lengthM = cum[cum.length - 1];
  const n = Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.round(lengthM / SPACING_M) + 1));
  const raw = Array.from({ length: n }, (_, i) => pointAt(coords, cum, (lengthM * i) / (n - 1)));
  const k = 2;
  const points = raw.map((p, i) => {
    if (i === 0 || i === n - 1) return p;
    const lo = Math.max(0, i - k);
    const hi = Math.min(n - 1, i + k);
    let lon = 0;
    let lat = 0;
    let ele = 0;
    let withEle = 0;
    for (let j = lo; j <= hi; j++) {
      lon += raw[j][0];
      lat += raw[j][1];
      const e = raw[j][2];
      if (e !== null) {
        ele += e;
        withEle++;
      }
    }
    const count = hi - lo + 1;
    return [lon / count, lat / count, withEle === count ? ele / withEle : null] as [number, number, number | null];
  });
  return { points, lengthM };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** How long the line takes to draw: longer routes get more time, within 7–15 s. */
export function drawMs(lengthM: number): number {
  return Math.round(Math.min(15000, Math.max(7000, 6000 + 0.7 * lengthM)));
}

/**
 * The whole flyover. Null when there's no route to fly (fewer than two
 * usable points, or a route under 50 m).
 * With `reduceMotion`, the line is drawn and the camera holds the overview:
 * one cue per frame for the hold, no follow, no orbit.
 */
export function flyoverPlan(
  coords: Coord[],
  stats: FlyoverStats,
  options: { reduceMotion?: boolean } = {},
): FlyoverPlan | null {
  const line = usable(coords);
  if (line.length < 2) return null;
  const { points, lengthM } = resample(line);
  if (lengthM < 50) return null;

  const along = points.map((_, i) => i / (points.length - 1));
  let peak = -1;
  if (points.every((p) => p[2] !== null)) {
    peak = 0;
    for (let i = 1; i < points.length; i++) if ((points[i][2] as number) > (points[peak][2] as number)) peak = i;
  }

  // Gain counts up with the climb itself when elevations exist, else evenly.
  const climb = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1][2];
    const cur = points[i][2];
    climb.push(climb[i - 1] + (prev !== null && cur !== null ? Math.max(0, cur - prev) : 0));
  }
  const totalClimb = climb[climb.length - 1];
  const gainShare = (a: number) => {
    if (totalClimb <= 0) return a;
    const x = a * (points.length - 1);
    const i = Math.min(points.length - 2, Math.floor(x));
    return (climb[i] + (climb[i + 1] - climb[i]) * (x - i)) / totalClimb;
  };
  const cue = (a: number, o: number, p: number): Cue => ({
    a,
    o,
    p,
    km: stats.distanceKm * a,
    gain: stats.gainM * gainShare(a),
    secs: stats.durationSeconds * a,
  });

  const frames = (ms: number) => Math.max(1, Math.round((ms / 1000) * FPS));
  const cues: Cue[] = [];
  if (options.reduceMotion) {
    for (let i = 0; i < frames(HOLD_MS * 2); i++) cues.push(cue(1, -1, 1));
  } else {
    const draw = drawMs(lengthM);
    // Orbit only at a real high point partway along; a summit at the very end orbits after the draw.
    const peakA = peak >= 0 ? along[peak] : -1;
    const split = peakA > 0.05 && peakA < 0.95 ? peakA : -1;
    if (split > 0) {
      const first = frames(draw * split);
      for (let i = 1; i <= first; i++) cues.push(cue(split * easeOut(i / first), -1, -1));
      for (let i = 1; i <= frames(ORBIT_MS); i++) cues.push(cue(split, easeInOut(i / frames(ORBIT_MS)), -1));
      const second = frames(draw * (1 - split));
      for (let i = 1; i <= second; i++) cues.push(cue(split + (1 - split) * easeInOut(i / second), -1, -1));
    } else {
      const n = frames(draw);
      for (let i = 1; i <= n; i++) cues.push(cue(easeInOut(i / n), -1, -1));
      if (peak >= 0) for (let i = 1; i <= frames(ORBIT_MS); i++) cues.push(cue(1, easeInOut(i / frames(ORBIT_MS)), -1));
    }
    for (let i = 1; i <= frames(PULL_MS); i++) cues.push(cue(1, -1, easeInOut(i / frames(PULL_MS))));
    for (let i = 0; i < frames(HOLD_MS); i++) cues.push(cue(1, -1, 1));
  }

  // Steepness in ~24 stretches; a 25% grade or more is full brightness.
  const steep: [number, number][] = [];
  const parts = Math.min(24, points.length - 1);
  for (let k = 0; k <= parts; k++) {
    const i = Math.round((k / parts) * (points.length - 1));
    const lo = Math.max(0, i - Math.ceil((points.length - 1) / parts / 2));
    const hi = Math.min(points.length - 1, i + Math.ceil((points.length - 1) / parts / 2));
    const run = (lengthM * (hi - lo)) / (points.length - 1);
    const a = points[lo][2];
    const b = points[hi][2];
    const grade = a !== null && b !== null && run > 0 ? Math.abs(b - a) / run : 0;
    steep.push([along[i], Math.min(1, grade / 0.25)]);
  }

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of points) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }

  return { points, along, peak, steep, lengthM, fps: FPS, cues, stats, bounds: [[west, south], [east, north]] };
}

/** Seconds of video a plan makes. */
export function planSeconds(plan: FlyoverPlan): number {
  return plan.cues.length / plan.fps;
}

/** The three numbers under the flyover, as the video prints them. */
export function cueLabels(cue: Pick<Cue, 'km' | 'gain' | 'secs'>): { miles: string; feet: string; time: string } {
  const mi = cue.km / 1.609344;
  const h = Math.floor(cue.secs / 3600);
  const m = Math.floor((cue.secs % 3600) / 60);
  return {
    miles: mi >= 10 ? String(Math.round(mi)) : mi.toFixed(1),
    feet: Math.round(cue.gain * 3.28084).toLocaleString('en-US'),
    time: h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m} min`,
  };
}

/**
 * Whether Finish plays the flyover. It needs a recorded route, a Mapbox token
 * and a connection for the terrain; otherwise Finish goes straight to ranking
 * and the flyover waits on the trail page.
 */
export function shouldFly(input: { coords: Coord[] | null | undefined; online: boolean; hasToken: boolean }): boolean {
  return input.online && input.hasToken && usable(input.coords ?? []).length >= 2;
}
