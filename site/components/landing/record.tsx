"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { Pause, Play } from "lucide-react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { LiveLine } from "@/components/charts/live-line";
import { LiveLineChart, type LiveLinePoint } from "@/components/charts/live-line-chart";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { StatusIsland } from "@/components/kokonutui/status-island";
import { TRAILS } from "@/lib/trails";

import { RecordPinned } from "./record-pinned";
import { sfx } from "./sound";
import { H2, Step } from "./reveal";
import { feetAt, fmt, routePath, summitMiles, walker } from "./route";

const TRAIL = TRAILS[0]; // Mount Si
const LOOP_SECONDS = 24;
const TICK_MS = 400;
const HIKE_HOURS = 4.6;
const SUMMIT_MI = summitMiles(TRAIL);

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

/** The self-playing version, used on phones and small tablets. */
function RecordAuto() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-15% 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const running = inView && !reduce && !paused;

  const route = useMemo(() => routePath(TRAIL, 400, 34), []);
  const at = useMemo(() => walker(route.points), [route]);

  // One clock drives the line, the dot and the readouts, so they can't drift apart.
  const progress = useMotionValue(reduce ? 0.3 : 0.16);
  useAnimationFrame((_, delta) => {
    if (!running) return;
    const next = progress.get() + Math.min(delta, 64) / 1000 / LOOP_SECONDS;
    progress.set(next >= 1 ? 0 : next);
  });
  const drawn = useTransform(progress, (p) => {
    const mi = p * TRAIL.miles;
    return Math.max(0.002, mi <= SUMMIT_MI ? routeFraction(mi) : 1);
  });
  const dotX = useTransform(progress, (p) => at(routeFraction(p * TRAIL.miles))[0]);
  const dotY = useTransform(progress, (p) => at(routeFraction(p * TRAIL.miles))[1]);

  const [{ t, data }, setRun] = useState<{ t: number; data: LiveLinePoint[] }>({
    t: progress.get(),
    data: [],
  });

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

  const miles = t * TRAIL.miles;
  const feet = feetAt(TRAIL, miles);
  const climbed = climbTo(miles);
  const minutes = t * HIKE_HOURS * 60;
  const [startX, startY] = route.points[0];
  const [topX, topY] = route.points[route.points.length - 1];

  return (
    <section className="relative overflow-hidden py-28 sm:py-36" id="record" ref={ref}>
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-20">
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
                  progress: t,
                },
              ]}
            />
          </div>

          <div className="grid sm:grid-cols-[1fr_1.15fr]">
            {/* The route draws itself to the summit; the dot walks it there and back. */}
            <div className="relative aspect-square border-line border-b sm:border-r sm:border-b-0">
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
              <svg aria-label={`Route of ${TRAIL.name}`} className="absolute inset-0 size-full" role="img" viewBox="0 0 400 400">
                <defs>
                  <pattern height="22" id="grid" patternUnits="userSpaceOnUse" width="22">
                    <path d="M22 0H0v22" fill="none" stroke="#EFE9DD" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect fill="url(#grid)" height="400" width="400" />
                <path d={route.d} fill="none" stroke="#E4DCCB" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
                <motion.path
                  d={route.d}
                  fill="none"
                  stroke="#94552A"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="5"
                  style={{ pathLength: drawn }}
                />
                {/* Summit flag and trailhead. */}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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

const WIDE = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(WIDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Laptops get the pinned hike that the scrollbar drives; phones keep the
 * self-playing card, which fits a small screen and a thumb.
 */
export function Record() {
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
  const reduce = useReducedMotion();
  return wide && !reduce ? <RecordPinned /> : <RecordAuto />;
}
