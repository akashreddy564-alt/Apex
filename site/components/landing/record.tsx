"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { Pause, Play } from "lucide-react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { LiveLine } from "@/components/charts/live-line";
import { LiveLineChart, type LiveLinePoint } from "@/components/charts/live-line-chart";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { StatusIsland } from "@/components/kokonutui/status-island";
import { TRAILS } from "@/lib/trails";

import { sfx } from "./sound";
import { H2, Step } from "./reveal";
import { feetAt, fmt, routePath, summitMiles, walker } from "./route";

const TRAIL = TRAILS[0]; // Mount Si
const LOOP_SECONDS = 24;
const TICK_MS = 400;
const HIKE_HOURS = 4.6;
const SUMMIT_MI = summitMiles(TRAIL);
/** Where the summit falls in the round trip, as a fraction of the whole hike. */
const SUMMIT_T = SUMMIT_MI / TRAIL.miles;
/**
 * Share of the pinned scroll at which the dot arrives. The rest of the pin
 * holds that frame, so the section cannot release while the dot is still climbing.
 */
const SUMMIT_AT = 0.75;

/** Laptops with a mouse or trackpad scroll the hike; phones and reduced motion keep the self-playing card. */
const SCROLL_QUERY = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
function subscribeScrollMode(cb: () => void) {
  const m = window.matchMedia(SCROLL_QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
function useScrollMode() {
  return useSyncExternalStore(subscribeScrollMode, () => window.matchMedia(SCROLL_QUERY).matches, () => false);
}

/**
 * The route is drawn trailhead to summit; the hike is a round trip. Up the
 * mountain the walker moves out along the line, after the summit it walks
 * back down the same line, in step with the elevation profile.
 */
function routeFraction(miles: number) {
  return miles <= SUMMIT_MI ? miles / SUMMIT_MI : (TRAIL.miles - miles) / (TRAIL.miles - SUMMIT_MI);
}

/** Cumulative climb along the profile up to a distance, in feet. */
function climbTo(miles: number) {
  let gain = 0;
  let prev = TRAIL.profile[0][1];
  for (const [m, f] of TRAIL.profile) {
    if (m > miles) break;
    if (f > prev) gain += f - prev;
    prev = f;
  }
  const here = feetAt(TRAIL, miles);
  if (here > prev) gain += here - prev;
  return gain;
}

function backfill(t: number, now: number): LiveLinePoint[] {
  const per = TICK_MS / 1000 / LOOP_SECONDS;
  return Array.from({ length: 46 }, (_, k) => {
    const back = 45 - k;
    const at = Math.max(0, t - back * per);
    return { time: now - (back * TICK_MS) / 1000, value: feetAt(TRAIL, at * TRAIL.miles) };
  });
}

export function Record() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px -15% 0px" });
  const reduce = useReducedMotion();
  const scrollMode = useScrollMode();
  const [paused, setPaused] = useState(false);
  const running = inView && !reduce && !paused && !scrollMode;

  const route = useMemo(() => routePath(TRAIL, 400, 34), []);
  const at = useMemo(() => walker(route.points), [route]);
  const routeLen = useMemo(() => {
    let n = 0;
    const pts = route.points;
    for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return n;
  }, [route]);

  // One clock drives the line, the dot and the readouts, so they can't drift apart.
  const progress = useMotionValue(reduce ? 0.3 : 0.16);
  useAnimationFrame((_, delta) => {
    if (!running) return;
    const next = progress.get() + Math.min(delta, 64) / 1000 / LOOP_SECONDS;
    progress.set(next >= 1 ? 0 : next);
  });
  const [{ t: clockT, data }, setRun] = useState<{ t: number; data: LiveLinePoint[] }>({
    t: progress.get(),
    data: [],
  });

  // Scroll mode: the section stays pinned for the whole climb. Progress is the
  // scroll position itself — a spring here lags a flick or a space-bar jump,
  // so the pin ends while the dot is still mid-trail. The summit arrives at
  // SUMMIT_AT; the rest of the pin holds that frame.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scrolled = useTransform(scrollYProgress, [0, SUMMIT_AT], [0, SUMMIT_T], { clamp: true });
  // Both inputs are read on every pass so the dot follows whichever clock is live,
  // including the flip onto scroll mode after hydration.
  const mode = useMotionValue(scrollMode ? 1 : 0);
  useEffect(() => {
    mode.set(scrollMode ? 1 : 0);
  }, [scrollMode, mode]);
  const drive = useTransform(() => {
    const onScroll = mode.get() > 0;
    const scrolledNow = scrolled.get();
    const clockNow = progress.get();
    return onScroll ? scrolledNow : clockNow;
  });
  const lastStage = useRef(0);
  useMotionValueEvent(scrolled, "change", (v) => {
    if (mode.get() <= 0) return;
    const stage = v >= SUMMIT_T - 0.002 ? 2 : v > 0.01 ? 1 : 0;
    if (stage === 2 && lastStage.current !== 2) sfx("achievement");
    lastStage.current = stage;
  });

  const drawn = useTransform(drive, (p) => {
    const mi = p * TRAIL.miles;
    return Math.max(0.002, mi <= SUMMIT_MI ? routeFraction(mi) : 1);
  });
  const dashOffset = useTransform(drawn, (d) => (1 - d) * routeLen);
  const dotX = useTransform(drive, (p) => at(routeFraction(p * TRAIL.miles))[0]);
  const dotY = useTransform(drive, (p) => at(routeFraction(p * TRAIL.miles))[1]);

  // Space, page down and end can jump a whole viewport. Hold them at the
  // summit frame; a flick that skips the pin entirely is pulled back to it.
  useEffect(() => {
    if (!scrollMode) return;
    const el = ref.current;
    if (!el) return;
    let cache = { start: 0, summit: 0, end: 0 };
    let armed = false;
    let holdUntil = 0;
    const measure = () => {
      const start = el.getBoundingClientRect().top + window.scrollY;
      const pin = Math.max(1, el.offsetHeight - window.innerHeight);
      cache = { start, summit: start + pin * SUMMIT_AT, end: start + pin };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);
    // Non-passive only while this section is on screen, so the rest of the
    // page keeps compositor scrolling. A flick that would skip the summit is
    // stopped on it; the rest of that gesture is swallowed, then the next one leaves.
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      const y = window.scrollY;
      const now = performance.now();
      if (dy < 0) {
        holdUntil = 0;
        return;
      }
      if (now < holdUntil && y >= cache.summit - 2 && y <= cache.end + 40) {
        e.preventDefault();
        return;
      }
      if (y < cache.summit && y + dy > cache.end - 8 && y + dy > cache.start) {
        e.preventDefault();
        window.scrollTo({ top: cache.summit, behavior: "instant" });
        holdUntil = now + 380;
      }
    };
    let listening = false;
    const attach = () => {
      if (listening) return;
      listening = true;
      measure();
      window.addEventListener("wheel", onWheel, { passive: false });
    };
    const detach = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("wheel", onWheel);
    };
    // Arm only as the hike approaches, so the rest of the page is not wheel-blocked.
    const onScroll = () => {
      const y = window.scrollY;
      if (y >= cache.start - window.innerHeight && y <= cache.end + 24) attach();
      else detach();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const big = new Set([" ", "PageDown", "End"]);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (!big.has(e.key)) return;
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) return;
      const y = window.scrollY;
      if (y < cache.start - 4 || y > cache.end + 4) return;
      if (armed && y >= cache.summit - 2 && y < cache.end - 2) {
        e.preventDefault();
        return;
      }
      const jump = e.key === "End" ? Number.POSITIVE_INFINITY : window.innerHeight;
      if (y < cache.summit - 2 && y + jump > cache.summit) {
        e.preventDefault();
        armed = true;
        window.scrollTo({ top: cache.summit, behavior: "instant" });
      }
    };
    const onKeyUp = () => {
      armed = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      detach();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [scrollMode]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const next = progress.get();
      const now = Date.now() / 1000;
      setRun((prev) => {
        const restarted = next < prev.t;
        const kept = restarted || prev.data.length === 0 ? backfill(next, now) : prev.data.filter((p) => p.time > now - 40);
        return { t: next, data: [...kept, { time: now, value: feetAt(TRAIL, next * TRAIL.miles) }] };
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, progress]);

  // Numbers and the chart follow the same clock as the dot. Scroll mode writes
  // them here, not from a spring, and the route map is memoized so this render
  // doesn't remeasure the path.
  const [scrollT, setScrollT] = useState(0);
  useMotionValueEvent(drive, "change", (v) => {
    if (mode.get() <= 0) return;
    setScrollT((prev) => (Math.abs(prev - v) < 0.008 ? prev : v));
  });

  // Everything below reads the scroll position in scroll mode, the clock otherwise.
  const t = scrollMode ? scrollT : clockT;
  const miles = t * TRAIL.miles;
  const feet = feetAt(TRAIL, miles);
  const climbed = climbTo(miles);
  const minutes = t * HIKE_HOURS * 60;
  const [startX, startY] = route.points[0];
  const [topX, topY] = route.points[route.points.length - 1];

  return (
    <section
      className={scrollMode ? "relative h-[240svh]" : "relative overflow-hidden py-28 sm:py-36"}
      id="record"
      ref={ref}
    >
      <div className={scrollMode ? "sticky top-0 flex h-svh items-center overflow-hidden" : undefined}>
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
        <div>
          <Step n={1} />
          <h2 className={`${H2} text-ink`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Press record. Apex does the rest.
            </WordsStagger>
          </h2>
          <p className="mt-6 max-w-[34rem] text-[1.075rem] text-muted-ink leading-relaxed [text-wrap:pretty]">
            Your route, distance and every foot of climb, tracked with the screen off and no signal.
            Apex knows which trail you&apos;re on before you reach the top.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-line rounded-2xl bg-white shadow-[0_0_0_1px_rgba(28,33,30,0.08),0_12px_30px_-18px_rgba(28,33,30,0.3)]">
            <Stat label="Distance" tone="text-distance" unit="mi" value={miles.toFixed(1)} />
            <Stat label="Climbed" tone="text-climb" unit="ft" value={fmt(climbed)} />
            <Stat
              label="Moving"
              tone="text-ink"
              unit=""
              value={`${Math.floor(minutes / 60)}h ${String(Math.floor(minutes % 60)).padStart(2, "0")}m`}
            />
          </dl>
          {scrollMode ? (
            <p className="mt-4 text-[13px] text-muted-ink tabular-nums">
              {t < 0.01 ? "Scroll to climb ↓" : t >= SUMMIT_T - 0.002 ? "Summit reached" : `${Math.round((t / SUMMIT_T) * 100)}% to the summit`}
            </p>
          ) : null}
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-white shadow-[0_0_0_1px_rgba(28,33,30,0.07),0_40px_80px_-40px_rgba(28,33,30,0.35)]">
          <div className="flex items-center justify-center px-4 pt-5">
            <StatusIsland
              tasks={[
                {
                  id: "rec",
                  label: `Recording ${TRAIL.name}`,
                  detail: `${miles.toFixed(1)} mi`,
                  status: "running",
                  // Scroll mode only climbs, so the pill counts to the summit like the line under the stats.
                  progress: scrollMode ? Math.min(1, t / SUMMIT_T) : t,
                },
              ]}
            />
          </div>

          <div className="grid sm:grid-cols-[1fr_1.15fr]">
            {/* The route draws itself to the summit; the dot walks it there and back. */}
            <div className="relative aspect-square border-line border-b sm:border-r sm:border-b-0">
              {!scrollMode && (
              <button
                aria-label={paused ? "Play the recording demo" : "Pause the recording demo"}
                className="press absolute top-2 right-2 z-10 grid size-11 place-items-center rounded-full text-muted-ink transition-colors duration-150 hover:bg-raised hover:text-ink"
                onClick={() => {
                  sfx(paused ? "play" : "pause");
                  setPaused((p) => !p);
                }}
                type="button"
              >
                {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              )}
              <RouteMap
                dashOffset={dashOffset}
                dotX={dotX}
                dotY={dotY}
                drawnLen={routeLen}
                reduce={!!reduce}
                routeD={route.d}
                startX={startX}
                startY={startY}
                topX={topX}
                topY={topY}
              />
              <p className="absolute bottom-4 left-4 font-medium text-[12px] text-muted-ink">
                {TRAIL.region} · {fmt(TRAIL.peakFt)} ft summit
              </p>
            </div>

            {/* Elevation streaming in: brown on the way up, blue on the way down. */}
            <div className="flex flex-col p-5">
              <div className="flex items-baseline justify-between">
                <p className="font-medium text-[13px] text-muted-ink">Elevation</p>
                <p className="font-display font-bold text-2xl text-ink tabular-nums">
                  {fmt(feet)}
                  <span className="ml-1 font-sans font-normal text-muted-ink text-sm">ft</span>
                </p>
              </div>
              <div className="mt-3 h-56 flex-1 sm:h-auto">
                {scrollMode ? (
                  <ClimbProfile t={t} />
                ) : (
                <LiveLineChart
                  className="h-full min-h-56"
                  data={data}
                  exaggerate
                  margin={{ top: 16, right: 64, bottom: 12, left: 44 }}
                  paused={!running}
                  value={feet}
                  window={18}
                >
                  <LiveYAxis formatValue={(v) => fmt(v)} position="left" />
                  <LiveLine
                    badge
                    dataKey="value"
                    formatValue={(v) => `${fmt(v)} ft`}
                    momentumColors={{ up: "#94552A", down: "#2B6A99", flat: "#2F7A4A" }}
                    strokeWidth={2.5}
                  />
                </LiveLineChart>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}

const RouteMap = memo(function RouteMap({
  routeD,
  drawnLen,
  dashOffset,
  dotX,
  dotY,
  startX,
  startY,
  topX,
  topY,
  reduce,
}: {
  routeD: string;
  drawnLen: number;
  dashOffset: MotionValue<number>;
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
  startX: number;
  startY: number;
  topX: number;
  topY: number;
  reduce: boolean;
}) {
  return (
    <svg aria-label={`Route of ${TRAIL.name}`} className="absolute inset-0 size-full" role="img" viewBox="0 0 400 400">
      <defs>
        <pattern height="22" id="grid" patternUnits="userSpaceOnUse" width="22">
          <path d="M22 0H0v22" fill="none" stroke="#EFE9DD" strokeWidth="1" />
        </pattern>
      </defs>
      <rect fill="url(#grid)" height="400" width="400" />
      <path d={routeD} fill="none" stroke="#E4DCCB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      {/* Dash offset uses the precomputed length, so the browser never calls getPointAtLength per frame. */}
      <motion.path
        d={routeD}
        fill="none"
        stroke="#94552A"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
        style={{ strokeDasharray: drawnLen, strokeDashoffset: dashOffset }}
      />
      <g transform={`translate(${topX} ${topY})`}>
        <circle fill="#fff" r="7" stroke="#94552A" strokeWidth="3" />
      </g>
      <circle cx={startX} cy={startY} fill="#1C211E" r="6" />
      <motion.g style={{ x: dotX, y: dotY }}>
        {!reduce && (
          <circle fill="#2B6A99" opacity="0.18" r="16">
            <animate attributeName="r" dur="1.6s" repeatCount="indefinite" values="8;18;8" />
          </circle>
        )}
        <circle fill="#2B6A99" r="7" stroke="#fff" strokeWidth="3" />
      </motion.g>
    </svg>
  );
});

function Stat({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="px-3.5 py-4 sm:px-4">
      <dt className="font-medium text-[12px] text-muted-ink">{label}</dt>
      <dd className={`mt-1 whitespace-nowrap font-display font-bold text-[1.3rem] tabular-nums sm:text-2xl ${tone}`}>
        {value}
        {unit ? <span className="ml-1 font-sans font-normal text-muted-ink text-sm">{unit}</span> : null}
      </dd>
    </div>
  );
}

const UP = TRAIL.profile.filter(([m]) => m <= SUMMIT_MI);
const LOW = Math.min(...UP.map((p) => p[1]));
const HIGH = Math.max(...UP.map((p) => p[1]));
const W = 300;
const H = 220;
const px = (mi: number) => (mi / SUMMIT_MI) * W;
const py = (ft: number) => 12 + (1 - (ft - LOW) / (HIGH - LOW)) * (H - 24);
const PROFILE = UP.map(([m, f], i) => `${i ? "L" : "M"}${px(m).toFixed(1)} ${py(f).toFixed(1)}`).join(" ");
const TICKS = [LOW, (LOW + HIGH) / 2, HIGH];

/** Scroll mode's chart: the climb to the summit, filling in as you scroll. */
function ClimbProfile({ t }: { t: number }) {
  const mi = Math.min(SUMMIT_MI, t * TRAIL.miles);
  const x = px(mi);
  const y = py(feetAt(TRAIL, mi));
  const shown = `inset(0 ${Math.max(0, 100 - (x / W) * 100)}% 0 0)`;
  return (
    <div className="relative h-full min-h-56 pl-12">
      <div className="relative h-full">
      <svg aria-hidden className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${W} ${H}`}>
        {TICKS.map((ft) => (
          <line key={ft} stroke="#EFE9DD" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" x1="0" x2={W} y1={py(ft)} y2={py(ft)} />
        ))}
        <path d={`${PROFILE} L${W} ${H} L0 ${H}Z`} fill="#94552A" fillOpacity="0.06" />
        <path d={PROFILE} fill="none" stroke="#E4DCCB" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <g style={{ clipPath: shown }}>
          <path d={`${PROFILE} L${W} ${H} L0 ${H}Z`} fill="#94552A" fillOpacity="0.16" />
          <path d={PROFILE} fill="none" stroke="#94552A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {/* The dot is HTML so it stays round while the chart stretches. */}
      <span
        className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-climb shadow-[0_0_0_4px_rgba(148,85,42,0.18)]"
        style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
      />
      </div>
      {/* Labels sit on the dashed lines, left of the chart. */}
      {[HIGH, LOW].map((ft) => (
        <span
          className="pointer-events-none absolute left-0 w-10 -translate-y-1/2 text-right text-[11px] text-muted-ink tabular-nums"
          key={ft}
          style={{ top: `${(py(ft) / H) * 100}%` }}
        >
          {fmt(ft)}
        </span>
      ))}
    </div>
  );
}
