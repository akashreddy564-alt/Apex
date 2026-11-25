/**
 * The launch intro: the APEX wordmark from the splash, then the A turns into
 * a peak, the camera pushes into it, and the peak opens into the opening
 * photo. Geometry and timing only, so the splash PNG script, the native
 * (Skia) and web (SVG) renderers and the tests all draw the same shapes.
 *
 * Letters live in "mark units": cap height 100, y down, the A starting at x 0.
 * Every function is a worklet so it can run on the UI thread.
 */

export type Pt = readonly [number, number];

/** Total length of the intro. */
export const INTRO_MS = 1_600;
/** Holds on the wordmark first, so the splash's own fade-out doesn't hide the start. */
export const INTRO_DELAY_MS = 200;

/** The splash PNG: a square canvas with the wordmark centred across `MARK_PX`. */
export const SPLASH = {
  canvasPx: 1024,
  markPx: 560,
  /** `imageWidth` in the expo-splash-screen config: points the canvas is drawn at. */
  imageWidthPt: 200,
} as const;

export const MARK_WIDTH = 332;
export const MARK_HEIGHT = 100;

/** The A as one outline: base left, top, base right, then the inside notch. */
export const A_SHAPE: readonly Pt[] = [
  [0, 100],
  [31, 0],
  [49, 0],
  [80, 100],
  [61, 100],
  [40, 30],
  [19, 100],
];

/** Where each A point ends up: a peak with a shoulder, the notch closed onto the base. */
export const PEAK_SHAPE: readonly Pt[] = [
  [-50, 100],
  [36, -12],
  [50, 8],
  [130, 100],
  [60, 100],
  [40, 100],
  [20, 100],
];

export const A_BAR: readonly Pt[] = [
  [22, 62],
  [58, 62],
  [58, 78],
  [22, 78],
];

/** Snow on the summit, its lower edge ragged. */
export const SNOW_CAP: readonly Pt[] = [
  [36, -12],
  [50, 8],
  [57, 16],
  [48, 13],
  [40, 22],
  [30, 13],
  [21, 20],
  [13, 18],
];

const P_X = 96;
const E_X = 178;
const X_X = 252;

/** P is an outline with a hole: draw both with even-odd fill. */
export const P_OUTER: readonly Pt[] = [
  [P_X, 0],
  [P_X + 52, 0],
  [P_X + 66, 14],
  [P_X + 66, 46],
  [P_X + 52, 60],
  [P_X + 18, 60],
  [P_X + 18, 100],
  [P_X, 100],
];
export const P_HOLE: readonly Pt[] = [
  [P_X + 18, 18],
  [P_X + 44, 18],
  [P_X + 48, 22],
  [P_X + 48, 38],
  [P_X + 44, 42],
  [P_X + 18, 42],
];

export const E_SHAPE: readonly Pt[] = [
  [E_X, 0],
  [E_X + 58, 0],
  [E_X + 58, 18],
  [E_X + 18, 18],
  [E_X + 18, 41],
  [E_X + 52, 41],
  [E_X + 52, 59],
  [E_X + 18, 59],
  [E_X + 18, 82],
  [E_X + 58, 82],
  [E_X + 58, 100],
  [E_X, 100],
];

export const X_BARS: readonly (readonly Pt[])[] = [
  [
    [X_X, 0],
    [X_X + 20, 0],
    [X_X + 80, 100],
    [X_X + 60, 100],
  ],
  [
    [X_X + 60, 0],
    [X_X + 80, 0],
    [X_X + 20, 100],
    [X_X, 100],
  ],
];

/** The point inside the peak the camera pushes into. */
const FOCUS: Pt = [40, 55];
/** Shortest distance from FOCUS to the peak's edge, in mark units. */
const FOCUS_CLEARANCE = 38;
const MARK_CENTRE: Pt = [MARK_WIDTH / 2, MARK_HEIGHT / 2];

/** Points per mark unit when the wordmark matches the splash image exactly. */
export function splashScale(): number {
  'worklet';
  return (SPLASH.imageWidthPt / SPLASH.canvasPx) * (SPLASH.markPx / MARK_WIDTH);
}

export interface Shape {
  /** Screen points, flat: x0, y0, x1, y1, … */
  points: number[];
  /** Extra outlines cut out of this one (even-odd). */
  holes: number[][];
  alpha: number;
}

export interface IntroFrame {
  /** The peak's outline cut out of the dark cover, or null while it's solid. */
  window: number[] | null;
  /** The A, then the peak, painted solid. */
  peak: Shape;
  bar: Shape;
  cap: Shape;
  letters: Shape[];
  /** 0 while it's the A (wordmark ink), 1 once it's the peak (stone, so the snow shows). */
  tone: number;
  /** True once the window covers the whole screen and the cover can go. */
  done: boolean;
}

function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 0 → 1 as t runs from a to b. */
export function span(t: number, a: number, b: number): number {
  'worklet';
  return clamp01((t - a) / (b - a));
}

function easeInOut(v: number): number {
  'worklet';
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

function easeOut(v: number): number {
  'worklet';
  return 1 - Math.pow(1 - v, 3);
}

function easeIn(v: number): number {
  'worklet';
  return v * v * v;
}

function easeInQuad(v: number): number {
  'worklet';
  return v * v;
}

function mix(a: number, b: number, v: number): number {
  'worklet';
  return a + (b - a) * v;
}

/** Scale the camera ends at: the peak's edge just past the screen's corners. */
export function finalScale(width: number, height: number): number {
  'worklet';
  return (Math.hypot(width, height) / 2 / FOCUS_CLEARANCE) * 1.15;
}

/**
 * Everything on screen at time `t` (0–1). `width` and `height` are the
 * screen in points; the wordmark sits at its centre, like the splash.
 */
export function introFrame(t: number, width: number, height: number): IntroFrame {
  'worklet';
  const s0 = splashScale();
  const s1 = s0 * 4.5;
  const sEnd = finalScale(width, height);

  // The camera: which mark point sits at screen centre, and how big a unit is.
  const centre = easeInOut(span(t, 0.04, 0.3));
  const ax = mix(MARK_CENTRE[0], FOCUS[0], centre);
  const ay = mix(MARK_CENTRE[1], FOCUS[1], centre);
  const grow = easeInOut(span(t, 0.18, 0.45));
  const push = easeInQuad(span(t, 0.52, 1));
  // Push in log space so the zoom keeps accelerating instead of stalling.
  const k = Math.exp(mix(Math.log(mix(s0, s1, grow)), Math.log(sEnd), push));
  const cx = width / 2;
  const cy = height / 2;

  const place = (pts: readonly Pt[], dx: number, dy: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      out.push(cx + (pts[i][0] + dx - ax) * k, cy + (pts[i][1] + dy - ay) * k);
    }
    return out;
  };

  const morph = easeInOut(span(t, 0.2, 0.45));
  const peakPts: Pt[] = [];
  for (let i = 0; i < A_SHAPE.length; i++) {
    peakPts.push([mix(A_SHAPE[i][0], PEAK_SHAPE[i][0], morph), mix(A_SHAPE[i][1], PEAK_SHAPE[i][1], morph)]);
  }
  const peakPoints = place(peakPts, 0, 0);
  // Once the peak has landed it becomes a window: its paint fades to show the photo.
  const solid = 1 - span(t, 0.52, 0.7);

  const letterOut = (start: number): { alpha: number; dx: number } => {
    const v = span(t, start, start + 0.14);
    return { alpha: 1 - v, dx: easeOut(v) * 14 };
  };
  const p = letterOut(0);
  const e = letterOut(0.03);
  const x = letterOut(0.06);

  const barFall = easeIn(span(t, 0.18, 0.34));

  return {
    window: t >= 0.52 ? peakPoints : null,
    peak: { points: peakPoints, holes: [], alpha: solid },
    bar: { points: place(A_BAR, 0, barFall * 40), holes: [], alpha: 1 - barFall },
    cap: { points: place(SNOW_CAP, 0, 0), holes: [], alpha: Math.min(span(t, 0.36, 0.48), solid) },
    letters: [
      { points: place(P_OUTER, p.dx, 0), holes: [place(P_HOLE, p.dx, 0)], alpha: p.alpha },
      { points: place(E_SHAPE, e.dx, 0), holes: [], alpha: e.alpha },
      { points: place(X_BARS[0], x.dx, 0), holes: [], alpha: x.alpha },
      { points: place(X_BARS[1], x.dx, 0), holes: [], alpha: x.alpha },
    ],
    tone: morph,
    done: t >= 1,
  };
}

/** An SVG path string for flat points, with any holes as extra subpaths. */
export function toSvgPath(points: number[], holes: number[][] = []): string {
  'worklet';
  const sub = (pts: number[]) => {
    let d = '';
    for (let i = 0; i < pts.length; i += 2) {
      d += `${i === 0 ? 'M' : 'L'}${pts[i].toFixed(2)} ${pts[i + 1].toFixed(2)}`;
    }
    return `${d}Z`;
  };
  let d = sub(points);
  for (const hole of holes) d += sub(hole);
  return d;
}
