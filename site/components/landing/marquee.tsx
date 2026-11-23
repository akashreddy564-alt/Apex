"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useVelocity } from "motion/react";
import { useRef } from "react";

import { TRAILS } from "@/lib/trails";

import { fmt } from "./route";

/**
 * A band of real trails that drifts sideways and gets thrown faster, in the
 * scroll's direction, when you scroll hard.
 */
export function TrailMarquee() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const speed = useSpring(useVelocity(scrollY), { stiffness: 220, damping: 40 });
  const x = useMotionValue(0);
  const row = useRef<HTMLDivElement>(null);
  const dir = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    const half = (row.current?.scrollWidth ?? 2400) / 2;
    const v = speed.get();
    if (v > 40) dir.current = 1;
    if (v < -40) dir.current = -1;
    const boost = 1 + Math.min(7, Math.abs(v) / 350);
    let next = x.get() - dir.current * (Math.min(delta, 64) / 1000) * 55 * boost;
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });

  const items = TRAILS.map((t) => ({ name: t.name, ft: fmt(t.gainFt) }));
  return (
    <section aria-label="Trails in Apex" className="overflow-hidden border-line border-y bg-white py-6">
      <motion.div className="flex w-max items-center gap-10 whitespace-nowrap" ref={row} style={{ x }}>
        {[...items, ...items, ...items, ...items].map((t, i) => (
          <span className="flex items-baseline gap-3 font-display font-extrabold text-[clamp(1.8rem,4vw,3.4rem)] tracking-[-0.03em]" key={i}>
            <span className="text-ink">{t.name}</span>
            <span className="font-sans font-medium text-[0.45em] text-climb tracking-normal">{t.ft} ft</span>
            <svg aria-hidden className="ml-4 size-5 self-center text-line" viewBox="0 0 20 20">
              <path d="M2 17 8 5l3 5 2-3 5 10z" fill="currentColor" />
            </svg>
          </span>
        ))}
      </motion.div>
    </section>
  );
}
