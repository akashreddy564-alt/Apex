"use client";

import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useState } from "react";

const TOP_FT = 14410; // Mount Rainier

const STOPS = [
  { ft: 0, name: "Trailhead", line: "Press record. Apex tracks the route with the screen off.", bg: "#F5F1E8", ink: "#1C211E" },
  { ft: 3000, name: "Forest", line: "Every switchback and every foot of climb, counted.", bg: "#1D4630", ink: "#F5F1E8" },
  { ft: 7000, name: "Treeline", line: "Know how hard before you go: the NPS rating on every trail.", bg: "#94552A", ink: "#F5F1E8" },
  { ft: 11000, name: "Glacier", line: "Finish and fly back over the whole day in 3D.", bg: "#1F3F57", ink: "#F5F1E8" },
  { ft: TOP_FT, name: "Summit", line: "Rank it against everything you've climbed.", bg: "#0C0E0D", ink: "#F5F1E8" },
];

export function OptionC() {
  const { scrollYProgress } = useScroll();
  const stops = STOPS.map((_, i) => i / (STOPS.length - 1));
  const bg = useTransform(scrollYProgress, stops, STOPS.map((s) => s.bg));
  const markerY = useTransform(scrollYProgress, [0, 1], ["92%", "8%"]);
  const [ft, setFt] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (p) => setFt(Math.round(p * TOP_FT)));

  return (
    <main className="relative isolate">
      {/* Snap one screen at a time; the ground colour climbs with you. */}
      <style>{"html{scroll-snap-type:y mandatory}"}</style>
      <motion.div className="fixed inset-0 z-0" style={{ backgroundColor: bg }} />
      <Ridges progress={scrollYProgress} />

      {/* The altimeter. */}
      <div className="fixed top-0 right-4 z-40 flex h-[100svh] items-center sm:right-8">
        <div className="relative h-[70svh] w-14">
          {Array.from({ length: 29 }, (_, i) => (
            <span
              className="absolute right-0 h-px bg-current opacity-40 mix-blend-difference"
              key={i}
              style={{ top: `${8 + (i * 84) / 28}%`, width: i % 7 === 0 ? 22 : 10, color: "#fff" }}
            />
          ))}
          <motion.div className="absolute right-0 flex -translate-y-1/2 items-center gap-2" style={{ top: markerY }}>
            <span className="rounded-full bg-white px-2.5 py-1 font-display font-bold text-[13px] text-ink tabular-nums shadow">{ft.toLocaleString("en-US")} ft</span>
            <span className="h-0.5 w-6 bg-white" />
          </motion.div>
        </div>
      </div>

      {STOPS.map((s) => (
        <section className="relative z-10 grid h-[100svh] snap-start place-items-center px-6 text-center" key={s.name} style={{ color: s.ink }}>
          <div>
            <p className="font-display font-extrabold text-[clamp(4rem,14vw,12rem)] leading-none tracking-[-0.04em] tabular-nums">
              {s.ft.toLocaleString("en-US")}
              <span className="text-[0.3em]"> ft</span>
            </p>
            <p className="mt-4 font-display font-bold text-2xl">{s.name}</p>
            <p className="mx-auto mt-3 max-w-md opacity-75">{s.line}</p>
            {s.ft === 0 && <p className="mt-10 text-[13px] opacity-60">Option C · altitude · scroll to climb</p>}
          </div>
        </section>
      ))}
    </main>
  );
}

/** Mountain ridges that sink away below you as you gain altitude. */
function Ridges({ progress }: { progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const far = useTransform(progress, [0, 1], ["0%", "40%"]);
  const near = useTransform(progress, [0, 1], ["0%", "80%"]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0 h-[45svh]">
      <motion.svg className="absolute inset-0 size-full" preserveAspectRatio="none" style={{ y: far }} viewBox="0 0 1200 300">
        <path d="M0 300V170l120-50 110 40 140-90 120 70 160-100 140 80 130-40 140 60 140-30V300Z" fill="#000" opacity="0.08" />
      </motion.svg>
      <motion.svg className="absolute inset-0 size-full" preserveAspectRatio="none" style={{ y: near }} viewBox="0 0 1200 300">
        <path d="M0 300V220l160-40 120 30 150-70 130 50 170-60 160 50 150-30 160 40V300Z" fill="#000" opacity="0.14" />
      </motion.svg>
    </div>
  );
}
