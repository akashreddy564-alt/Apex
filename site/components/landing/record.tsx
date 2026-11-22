"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveLine } from "@/components/charts/live-line";
import { LiveLineChart, type LiveLinePoint } from "@/components/charts/live-line-chart";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { StatusIsland } from "@/components/kokonutui/status-island";
import { TRAILS } from "@/lib/trails";

import { Eyebrow, Reveal, RiseWords } from "./reveal";
import { feetAt, fmt, routePath } from "./route";

const TRAIL = TRAILS[0]; // Mount Si
const LOOP_SECONDS = 48;
const TICK_MS = 400;
const HIKE_HOURS = 4.6;

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

export function Record() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });
  const reduce = useReducedMotion();
  const [{ t, data }, setRun] = useState<{ t: number; data: LiveLinePoint[] }>({
    t: reduce ? 0.42 : 0.16,
    data: [],
  });
  const route = useMemo(() => routePath(TRAIL, 400, 34), []);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setInterval(() => {
      setRun((prev) => {
        const step = prev.t + TICK_MS / 1000 / LOOP_SECONDS;
        const next = step >= 1 ? 0 : step;
        const now = Date.now() / 1000;
        const per = TICK_MS / 1000 / LOOP_SECONDS;
        // First tick, or a new loop: backfill the last stretch so the chart
        // opens full instead of drawing from an empty window.
        const kept =
          next === 0 || prev.data.length === 0
            ? Array.from({ length: 45 }, (_, k) => {
                const back = 45 - k;
                const at = Math.max(0, next - back * per);
                return { time: now - (back * TICK_MS) / 1000, value: feetAt(TRAIL, at * TRAIL.miles) };
              })
            : prev.data.filter((p) => p.time > now - 40);
        return { t: next, data: [...kept, { time: now, value: feetAt(TRAIL, next * TRAIL.miles) }] };
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  const miles = t * TRAIL.miles;
  const feet = feetAt(TRAIL, miles);
  const climbed = climbTo(miles);
  const minutes = t * HIKE_HOURS * 60;


  const idx = Math.min(route.points.length - 1, Math.round(t * (route.points.length - 1)));
  const [dx, dy] = route.points[idx];

  return (
    <section className="relative overflow-hidden py-28 sm:py-40" id="record" ref={ref}>
      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <Eyebrow>01 · Record</Eyebrow>
          <h2 className="font-display font-extrabold text-[clamp(2.4rem,5.2vw,4.6rem)] text-ink leading-[0.95] tracking-[-0.04em]">
            <RiseWords text={"Press record.\nApex does the rest."} />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-7 max-w-md text-lg text-muted-ink leading-relaxed">
              Your route, distance and every foot of climb, tracked with the screen off. No signal
              needed. Apex knows which trail you&apos;re on before you reach the top.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line">
              <Stat label="Distance" tone="text-distance" unit="mi" value={Number(miles.toFixed(1))} />
              <Stat label="Climbed" tone="text-climb" unit="ft" value={Math.round(climbed)} />
              <Stat
                label="Moving"
                tone="text-ink"
                unit=""
                value={Math.floor(minutes / 60)}
                suffix={`h ${String(Math.floor(minutes % 60)).padStart(2, "0")}m`}
              />
            </dl>
          </Reveal>
        </div>

        <Reveal className="relative" delay={0.1}>
          <div className="relative overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_40px_80px_-40px_rgba(28,33,30,0.35)]">
            <div className="flex justify-center px-4 pt-5">
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

            <div className="grid gap-0 sm:grid-cols-[1fr_1.15fr]">
              {/* The route drawing itself as you walk it. */}
              <div className="relative aspect-square border-line border-b sm:border-r sm:border-b-0">
                <svg aria-label={`Route of ${TRAIL.name}`} className="absolute inset-0 size-full" role="img" viewBox="0 0 400 400">
                  <defs>
                    <pattern height="22" id="grid" patternUnits="userSpaceOnUse" width="22">
                      <path d="M22 0H0v22" fill="none" stroke="#EAE3D4" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect fill="url(#grid)" height="400" width="400" />
                  <path d={route.d} fill="none" stroke="#DDD4C2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
                  <motion.path
                    animate={{ pathLength: Math.max(0.001, t) }}
                    d={route.d}
                    fill="none"
                    initial={false}
                    stroke="#94552A"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                    transition={{ duration: TICK_MS / 1000, ease: "linear" }}
                  />
                  <circle cx={route.points[0][0]} cy={route.points[0][1]} fill="#1C211E" r="6" />
                  <motion.g animate={{ x: dx, y: dy }} initial={false} transition={{ duration: TICK_MS / 1000, ease: "linear" }}>
                    <circle fill="#2B6A99" opacity="0.18" r="18">
                      <animate attributeName="r" dur="1.6s" repeatCount="indefinite" values="8;20;8" />
                    </circle>
                    <circle fill="#2B6A99" r="7" stroke="#fff" strokeWidth="3" />
                  </motion.g>
                </svg>
                <p className="absolute bottom-4 left-4 font-medium text-[12px] text-muted-ink">
                  {TRAIL.region} · {fmt(TRAIL.peakFt)} ft summit
                </p>
              </div>

              {/* Elevation streaming in live, brown on the way up, blue on the way down. */}
              <div className="flex flex-col p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium text-[12px] text-muted-ink uppercase tracking-[0.16em]">Elevation</p>
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
                    paused={!inView}
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
        </Reveal>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  unit: string;
  tone: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white px-4 py-4">
      <dt className="font-medium text-[11px] text-muted-ink uppercase tracking-[0.14em]">{label}</dt>
      <dd className={`mt-1 font-display font-bold text-2xl tabular-nums ${tone}`}>
        {value.toLocaleString("en-US")}
        {suffix ? <span className="text-xl">{suffix}</span> : null}
        {unit ? <span className="ml-1 font-sans font-normal text-muted-ink text-sm">{unit}</span> : null}
      </dd>
    </div>
  );
}
