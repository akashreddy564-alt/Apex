"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useRef, useState } from "react";

/**
 * Wraps a section so it hands off to the next one: as it leaves the screen it
 * settles back a little (scale and dim) while the next
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
  // A transform on this wrapper, even scale(1), makes it the sticky containing
  // block, so the hike inside would scroll away before the dot reached the summit.
  // The handoff only starts once the section is already leaving. Scale and opacity
  // stay on the compositor; a rounded clip-path repainted the whole section each frame.
  const [live, setLive] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const on = !reduce && p >= 0.02;
    setLive((prev) => (prev === on ? prev : on));
  });

  return (
    <motion.div
      data-rail={label}
      data-tone={tone}
      data-snap
      ref={ref}
      style={live ? { scale, opacity, transformOrigin: "50% 100%" } : undefined}
    >
      {children}
    </motion.div>
  );
}
