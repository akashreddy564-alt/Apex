"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useMemo, useRef, useState } from "react";

import { TRAILS } from "@/lib/trails";

import { H2, Step } from "./reveal";
import { feetAt, fmt, routePath, summitMiles, walker } from "./route";
import { sfx } from "./sound";

const TRAIL = TRAILS[0]; // Mount Si
const SUMMIT = summitMiles(TRAIL);
const UP = TRAIL.profile.filter(([m]) => m <= SUMMIT);
const MIN = Math.min(...UP.map((p) => p[1]));
const MAX = Math.max(...UP.map((p) => p[1]));
const HOURS_UP = 2.6;

const CHAPTERS = [
  { at: 0, title: "Trailhead", line: "North Bend, WA. Press record and put the phone away." },
  { at: 0.2, title: "Into the trees", line: "Switchback after switchback. Apex counts every foot." },
  { at: 0.52, title: "Haystack basin", line: "Halfway up. Still no signal, still recording." },
  { at: 0.9, title: "Summit", line: `${fmt(TRAIL.peakFt)} ft. Now fly back over it.` },
];

function climbTo(miles: number) {
  let gain = 0;
  let prev = UP[0][1];
  for (const [m, f] of UP) {
    if (m > miles) break;
    if (f > prev) gain += f - prev;
    prev = f;
  }
  return gain;
}

/**
 * The hike is the scroll: the section pins and the scrollbar walks Mount Si
 * from the trailhead to the summit. Scroll back up and the hike reverses.
 */
export function RecordPinned() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 150, damping: 32, mass: 0.35 });
  const hike = useTransform(p, [0.04, 0.9], [0, 1], { clamp: true });

  const route = useMemo(() => routePath(TRAIL, 600, 56), []);
  const at = useMemo(() => walker(route.points), [route]);
  const dotX = useTransform(hike, (h) => at(h)[0]);
  const dotY = useTransform(hike, (h) => at(h)[1]);
  const drawn = useTransform(hike, (h) => Math.max(0.002, h));
  const profileClip = useTransform(hike, (h) => `inset(0 ${100 - h * 100}% 0 0)`);
  // The map leans in as you climb: a slow push towards the summit.
  const mapScale = useTransform(hike, [0, 1], [1, 1.12]);

  const [h, setH] = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);
  useMotionValueEvent(hike, "change", (v) => {
    setH(v);
    const i = CHAPTERS.findLastIndex((c) => v >= c.at);
    if (i !== chapterIndex) {
      setChapterIndex(i);
      sfx(i === CHAPTERS.length - 1 ? "achievement" : "checkpoint");
    }
  });
  const chapter = CHAPTERS[chapterIndex];
  const miles = h * SUMMIT;
  const minutes = h * HOURS_UP * 60;

  const profile = UP.map(
    ([m, f], i) => `${i ? "L" : "M"}${((m / SUMMIT) * 600).toFixed(1)} ${(150 - ((f - MIN) / (MAX - MIN)) * 132).toFixed(1)}`
  ).join(" ");
  const [topX, topY] = route.points[route.points.length - 1];
  const [startX, startY] = route.points[0];

  return (
    <section className="relative h-[560vh]" id="record" ref={ref}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(70%_80%_at_70%_50%,#fff,#F5F1E8_75%)]" />

        <motion.div className="absolute inset-y-0 right-0 w-[56%]" style={{ scale: mapScale, originX: 0.6, originY: 0.3 }}>
          <svg aria-label={`Route of ${TRAIL.name}`} className="absolute inset-0 size-full" role="img" viewBox="0 0 600 600">
            <defs>
              <pattern height="30" id="pin-grid" patternUnits="userSpaceOnUse" width="30">
                <path d="M30 0H0v30" fill="none" stroke="#ECE5D7" strokeWidth="1" />
              </pattern>
            </defs>
            <rect fill="url(#pin-grid)" height="600" width="600" />
            {Array.from({ length: 11 }, (_, i) => (
              <ellipse
                cx={topX}
                cy={topY}
                fill="none"
                key={i}
                rx={26 + i * 40}
                ry={20 + i * 32}
                stroke="#94552A"
                strokeOpacity={i % 4 === 3 ? 0.3 : 0.12}
              />
            ))}
            <path d={route.d} fill="none" stroke="#E0D7C4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
            <motion.path d={route.d} fill="none" stroke="#94552A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" style={{ pathLength: drawn }} />
            <circle cx={startX} cy={startY} fill="#1C211E" r="8" />
            <circle cx={topX} cy={topY} fill="#fff" r="9" stroke="#94552A" strokeWidth="4" />
            <motion.g style={{ x: dotX, y: dotY }}>
              <circle fill="#2B6A99" opacity="0.18" r="22" />
              <circle fill="#2B6A99" r="9" stroke="#fff" strokeWidth="4" />
            </motion.g>
          </svg>
        </motion.div>

        <div className="relative mx-auto w-full max-w-7xl px-8">
          <div className="max-w-[27rem]">
            <Step n={1} />
            <h2 className={`${H2} text-ink`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Press record. Apex does the rest.
            </WordsStagger>
          </h2>

            <div className="mt-10 h-[5.5rem]">
              <AnimatePresence mode="wait">
                <motion.div
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  key={chapter.title}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                >
                  <p className="font-display font-bold text-2xl text-climb">{chapter.title}</p>
                  <p className="mt-1.5 text-muted-ink">{chapter.line}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <dl className="mt-6 grid grid-cols-4 gap-5">
              <Readout label="Elevation" tone="text-ink" unit="ft" value={fmt(feetAt(TRAIL, miles))} />
              <Readout label="Distance" tone="text-distance" unit="mi" value={miles.toFixed(1)} />
              <Readout label="Climbed" tone="text-climb" unit="ft" value={fmt(climbTo(miles))} />
              <Readout label="Moving" tone="text-ink" unit="" value={`${Math.floor(minutes / 60)}:${String(Math.floor(minutes % 60)).padStart(2, "0")}`} />
            </dl>

            <svg aria-hidden className="mt-7 h-24 w-full" preserveAspectRatio="none" viewBox="0 0 600 160">
              <path d={`${profile} L600 160 L0 160Z`} fill="#94552A" fillOpacity="0.07" />
              <path d={profile} fill="none" stroke="#DDD4C2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <motion.g style={{ clipPath: profileClip }}>
                <path d={`${profile} L600 160 L0 160Z`} fill="#94552A" fillOpacity="0.22" />
                <path d={profile} fill="none" stroke="#94552A" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              </motion.g>
            </svg>
            <p className="mt-3 text-[13px] text-muted-ink">
              {h < 0.02 ? "Scroll to climb ↓" : h > 0.98 ? "Summit reached" : `${Math.round(h * 100)}% to the summit`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Readout({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-ink">{label}</dt>
      <dd className={`mt-0.5 whitespace-nowrap font-display font-bold text-[1.6rem] tabular-nums ${tone}`}>
        {value}
        {unit ? <span className="ml-1 font-sans font-normal text-[13px] text-muted-ink">{unit}</span> : null}
      </dd>
    </div>
  );
}
