"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useRef } from "react";

/**
 * Wraps a section so it hands off to the next one: as it leaves the screen it
 * settles back a little (scale, dim and rounded corners) while the next
 * section scrolls up over it. Also marks the section as a snap point.
 */
export function Handoff({
  children,
  label,
  tone = "light",
}: {
  children: ReactNode;
  label: string;
  /** What the altitude rail sits on here; "none" hides it (the hike has its own altimeter). */
  tone?: "light" | "dark" | "none";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], reduce ? [1, 1] : [1, 0.6]);
  const clipPath = useTransform(scrollYProgress, (p) =>
    reduce || p < 0.01 ? "none" : `inset(0 round ${Math.round(p * 40)}px)`
  );

  return (
    <motion.div
      data-rail={label}
      data-tone={tone}
      data-snap
      ref={ref}
      style={{ scale, opacity, clipPath, transformOrigin: "50% 100%" }}
    >
      {children}
    </motion.div>
  );
}
