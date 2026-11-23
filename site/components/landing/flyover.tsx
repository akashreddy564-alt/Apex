"use client";

import { motion, useInView, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useMemo, useRef } from "react";

import { LineChart } from "@/components/charts/line-chart";
import { ParticleLine } from "@/components/charts/particle-line";
import { TRAILS } from "@/lib/trails";

import { Phone } from "./phone";
import { H2, Step } from "./reveal";
import { fmt } from "./route";

const TRAIL = TRAILS[0];
/** Where the flyover footage starts inside the screen recording, in seconds. */
const FLY_START = 13.4;
const EMBERS = ["#94552a", "#d9925e", "#f0c08a", "#fff1dc"] as const;

export function Flyover() {
  const ref = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInView = useInView(chartRef, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-12%", "12%"]);
  const photoScale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [1.25, 1.08, 1.18]);

  // The profile as a time series: one "minute" per sample, so the chart's
  // time axis lays the trail out by distance.
  const data = useMemo(() => {
    const start = Date.UTC(2026, 6, 4, 7);
    return TRAIL.profile.map(([mi, ft]) => ({
      date: new Date(start + mi * 3_600_000),
      ft,
    }));
  }, []);

  return (
    <section className="dark relative overflow-hidden bg-[#0c0e0d] text-paper" id="flyover" ref={ref}>
      <motion.div aria-hidden className="absolute inset-0" style={{ y: photoY, scale: photoScale }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" className="size-full object-cover opacity-55" loading="lazy" src="/photos/mount-rainier.jpg" />
      </motion.div>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_40%,transparent,rgba(12,14,13,0.75)_55%,#0c0e0d_90%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-paper/0 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 py-28 sm:px-8 sm:py-40 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Step dark n={2} />
          <h2 className={`${H2} text-paper`}>
            Then fly back over every step.
          </h2>
          <div>
            <p className="mt-6 max-w-[34rem] text-[1.075rem] text-paper/75 leading-relaxed [text-wrap:pretty]">
              Finish a hike and Apex turns it into a 3D flyover on real terrain: the line draws
              itself up the mountain, circles the summit and pulls back to show the whole day.
              Share it as a video in one tap.
            </p>
          </div>

          <div>
            <div
              className="mt-12 rounded-3xl bg-[#0c0e0d]/70 p-5 shadow-[0_0_0_1px_rgba(245,241,232,0.1)] sm:p-6"
              ref={chartRef}
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <p className="font-medium text-[13px] text-paper/70">
                  {TRAIL.name} · elevation
                </p>
                <p className="font-display font-bold text-[#d9925e] text-xl">
                  {fmt(TRAIL.gainFt)}
                  <span className="ml-1 font-sans font-normal text-paper/50 text-sm">ft up</span>
                </p>
              </div>
              <div className="h-44">
                {chartInView ? (
                  <LineChart
                    aspectRatio=""
                    className="h-full"
                    data={data}
                    margin={{ top: 12, right: 8, bottom: 8, left: 8 }}
                  >
                    <ParticleLine
                      colors={EMBERS}
                      dataKey="ft"
                      duration={3.2}
                      effect="comet"
                      stroke="#d9925e"
                      strokeWidth={2.5}
                    />
                  </LineChart>
                ) : null}
              </div>
              <div className="mt-3 flex justify-between text-[12px] text-paper/50 tabular-nums">
                <span>Trailhead · {fmt(TRAIL.profile[0][1])} ft</span>
                <span>Summit · {fmt(TRAIL.peakFt)} ft</span>
                <span>{TRAIL.miles} mi</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[320px]">
          <Phone className="bg-black shadow-[0_60px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]">
            <video
              aria-label="A Mount Si flyover playing in Apex"
              autoPlay
              className="absolute inset-0 size-full object-cover"
              muted
              // The recording opens on the app's opening and home screens; the flyover itself starts at 13.4 s.
              onEnded={(e) => {
                e.currentTarget.currentTime = FLY_START;
                void e.currentTarget.play();
              }}
              onLoadedMetadata={(e) => {
                e.currentTarget.currentTime = FLY_START;
              }}
              playsInline
              poster="/screens/dark-12-flyover-end.png"
              preload="metadata"
            >
              <source src="/screens/1-flyover.webm" type="video/webm" />
            </video>
          </Phone>
        </div>
      </div>
    </section>
  );
}
