"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { useMemo, useRef, useState } from "react";

import { feetAt, fmt, routePath, summitMiles, walker } from "@/components/landing/route";
import { Phone } from "@/components/landing/phone";
import { TRAILS } from "@/lib/trails";

import { SmoothScroll } from "./smooth";

const TRAIL = TRAILS[0];
const SUMMIT = summitMiles(TRAIL);
// One-way profile, trailhead to summit, for the scrubbed chart.
const UP = TRAIL.profile.filter(([m]) => m <= SUMMIT);
const MIN = Math.min(...UP.map((p) => p[1]));
const MAX = Math.max(...UP.map((p) => p[1]));

const CHAPTERS = [
  { at: 0, title: "Trailhead", line: "North Bend, WA. Press record and put the phone away." },
  { at: 0.22, title: "Into the trees", line: "Switchback after switchback. Apex counts every foot." },
  { at: 0.55, title: "Haystack basin", line: "Halfway up the climb. Still no signal, still recording." },
  { at: 0.86, title: "Summit", line: `${fmt(TRAIL.peakFt)} ft. Now watch it back from the sky.` },
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

export function OptionA() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  // 0 to 0.74 of the section climbs the trail; the rest pulls back into the flyover.
  const hike = useTransform(p, [0.02, 0.74], [0, 1], { clamp: true });
  const out = useTransform(p, [0.76, 0.96], [0, 1], { clamp: true });

  const route = useMemo(() => routePath(TRAIL, 600, 50), []);
  const at = useMemo(() => walker(route.points), [route]);
  const dotX = useTransform(hike, (h) => at(h)[0]);
  const dotY = useTransform(hike, (h) => at(h)[1]);
  const drawn = useTransform(hike, (h) => Math.max(0.002, h));

  // The map zooms in on the walker while climbing, then falls away to reveal the flyover.
  const mapScale = useTransform(out, [0, 1], [1, 0.55]);
  const mapOpacity = useTransform(out, [0, 0.7], [1, 0]);
  const panelOpacity = useTransform(out, [0, 0.5], [1, 0]);
  const flyScale = useTransform(out, [0, 1], [0.7, 1]);
  const flyOpacity = useTransform(out, [0.25, 0.8], [0, 1]);
  const profileClip = useTransform(hike, (h) => `inset(0 ${100 - h * 100}% 0 0)`);

  const [h, setH] = useState(0);
  useMotionValueEvent(hike, "change", setH);
  const miles = h * SUMMIT;
  const feet = feetAt(TRAIL, miles);
  const chapter = [...CHAPTERS].reverse().find((c) => h >= c.at) ?? CHAPTERS[0];

  const profile = UP.map(([m, f], i) => `${i ? "L" : "M"}${((m / SUMMIT) * 600).toFixed(1)} ${(160 - ((f - MIN) / (MAX - MIN)) * 140).toFixed(1)}`).join(" ");

  return (
    <main className="bg-paper text-ink">
      <SmoothScroll lerp={0.07} />
      <section className="grid min-h-[100svh] place-items-center px-6 text-center">
        <div>
          <p className="mb-6 font-medium text-[13px] text-muted-ink">Option A · the hike is the scroll</p>
          <h1 className="font-display font-extrabold text-[clamp(3rem,8vw,6rem)] leading-[0.92] tracking-[-0.035em]">
            Scroll to climb
            <br />
            Mount Si.
          </h1>
          <p className="mt-8 text-muted-ink">7.6 miles · 3,350 ft · keep going ↓</p>
        </div>
      </section>

      <section className="relative h-[700vh]" ref={ref}>
        <div className="sticky top-0 h-[100svh] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_35%_50%,#fff,#F5F1E8_70%)]" />

          {/* The map: route drawn by the scrollbar, the walker exactly on it. */}
          <motion.div className="absolute inset-y-0 left-0 w-full lg:w-[62%]" style={{ scale: mapScale, opacity: mapOpacity }}>
            <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" viewBox="0 0 600 600">
              <defs>
                <pattern height="30" id="lab-grid" patternUnits="userSpaceOnUse" width="30">
                  <path d="M30 0H0v30" fill="none" stroke="#E9E2D3" strokeWidth="1" />
                </pattern>
              </defs>
              <rect fill="url(#lab-grid)" height="600" width="600" />
              {Array.from({ length: 10 }, (_, i) => (
                <ellipse
                  cx={route.points[route.points.length - 1][0]}
                  cy={route.points[route.points.length - 1][1]}
                  fill="none"
                  key={i}
                  rx={30 + i * 42}
                  ry={22 + i * 34}
                  stroke="#94552A"
                  strokeOpacity={i % 4 === 3 ? 0.28 : 0.12}
                />
              ))}
              <path d={route.d} fill="none" stroke="#E0D7C4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
              <motion.path d={route.d} fill="none" stroke="#94552A" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" style={{ pathLength: drawn }} />
              <circle cx={route.points[0][0]} cy={route.points[0][1]} fill="#1C211E" r="8" />
              <circle cx={route.points[route.points.length - 1][0]} cy={route.points[route.points.length - 1][1]} fill="#fff" r="9" stroke="#94552A" strokeWidth="4" />
              <motion.g style={{ x: dotX, y: dotY }}>
                <circle fill="#2B6A99" opacity="0.18" r="22" />
                <circle fill="#2B6A99" r="9" stroke="#fff" strokeWidth="4" />
              </motion.g>
            </svg>
          </motion.div>

          {/* Readouts and chapters, scrubbed with the climb. */}
          <motion.div className="absolute inset-x-0 bottom-0 p-6 lg:inset-y-0 lg:right-0 lg:left-auto lg:flex lg:w-[38%] lg:flex-col lg:justify-center lg:p-12" style={{ opacity: panelOpacity }}>
            <AnimatePresence mode="wait">
              <motion.div
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                key={chapter.title}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              >
                <p className="font-display font-extrabold text-[clamp(2.2rem,4vw,3.6rem)] leading-none tracking-[-0.035em]">{chapter.title}</p>
                <p className="mt-3 max-w-sm text-muted-ink">{chapter.line}</p>
              </motion.div>
            </AnimatePresence>
            <dl className="mt-8 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-[12px] text-muted-ink">Elevation</dt>
                <dd className="font-display font-bold text-3xl tabular-nums">{fmt(feet)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-ink">Distance</dt>
                <dd className="font-display font-bold text-3xl text-distance tabular-nums">{miles.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-muted-ink">Climbed</dt>
                <dd className="font-display font-bold text-3xl text-climb tabular-nums">{fmt(climbTo(miles))}</dd>
              </div>
            </dl>
            <svg className="mt-6 h-28 w-full" preserveAspectRatio="none" viewBox="0 0 600 170">
              <path d={`${profile} L600 170 L0 170Z`} fill="#94552A" fillOpacity="0.08" />
              <path d={profile} fill="none" stroke="#DDD4C2" strokeWidth="2" />
              <motion.g style={{ clipPath: profileClip }}>
                <path d={`${profile} L600 170 L0 170Z`} fill="#94552A" fillOpacity="0.22" />
                <path d={profile} fill="none" stroke="#94552A" strokeWidth="3" />
              </motion.g>
            </svg>
          </motion.div>

          {/* At the summit the map falls away into the flyover. */}
          <motion.div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0c0e0d]" style={{ opacity: flyOpacity }}>
            <motion.div className="w-[min(300px,70vw)]" style={{ scale: flyScale }}>
              <Phone className="bg-black">
                <video
                  autoPlay
                  className="absolute inset-0 size-full object-cover"
                  muted
                  onEnded={(e) => {
                    e.currentTarget.currentTime = 13.4;
                    void e.currentTarget.play();
                  }}
                  playsInline
                  src="/screens/1-flyover.webm#t=13.4"
                />
              </Phone>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="grid min-h-[60svh] place-items-center bg-[#0c0e0d] px-6 text-center text-paper">
        <p className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] tracking-[-0.035em]">Then rank it.</p>
      </section>
    </main>
  );
}
