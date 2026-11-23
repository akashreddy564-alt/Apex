"use client";

import NumberFlow from "@number-flow/react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useState } from "react";

import { TRAILS } from "@/lib/trails";

import { feetAt, fmt, summitMiles } from "./route";
import { scrollToTarget } from "./smooth";
import { sfx } from "./sound";

const TRAIL = TRAILS[0]; // Mount Si
const SUMMIT = summitMiles(TRAIL);
const BASE_FT = feetAt(TRAIL, 0);

type Tick = { label: string; at: number; el: HTMLElement };

/** Altitude for a point on the page: the whole page is one climb up Mount Si. */
function feetFor(p: number) {
  return Math.round(feetAt(TRAIL, Math.min(1, Math.max(0, p)) * SUMMIT) / 10) * 10;
}

/**
 * A ruler on the right edge of the page. Scrolling the page climbs Mount Si:
 * the marker rides up the ruler and its altitude rolls. Each tick is a
 * section; click one to go there. Laptops and up only.
 */
export function AltitudeRail() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3 });
  const markerTop = useTransform(p, (v) => `${(1 - v) * 100}%`);
  const fill = useTransform(p, (v) => v);
  const [feet, setFeet] = useState(BASE_FT);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
  const [tone, setTone] = useState<"light" | "dark">("light");

  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const next = [...document.querySelectorAll<HTMLElement>("[data-rail]")].map((el) => ({
        label: el.dataset.rail ?? "",
        at: Math.min(1, (el.getBoundingClientRect().top + window.scrollY) / max),
        el,
      }));
      setTicks(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, []);

  useMotionValueEvent(p, "change", (v) => {
    setFeet(feetFor(v));
    const i = ticks.findLastIndex((t) => v >= t.at - 0.01);
    if (i !== active) setActive(i);
    // Whatever section sits under the middle of the screen decides the ink.
    const mid = window.innerHeight / 2;
    const under = ticks.find((t) => {
      const r = t.el.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid;
    });
    const t = under?.el.dataset.tone ?? "dark";
    setTone(t === "dark" ? "dark" : "light");
    setVisible(window.scrollY > window.innerHeight * 0.4 && t !== "none");
  });

  return (
    <motion.nav
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 12 }}
      aria-label="Sections, as altitude on Mount Si"
      className={`fixed top-1/2 right-5 z-40 hidden h-[56vh] -translate-y-1/2 transition-colors duration-300 ease-out xl:block ${
        tone === "dark" ? "text-paper" : "text-ink"
      }`}
      initial={false}
      style={{ pointerEvents: visible ? "auto" : "none" }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <p className="absolute -top-8 right-0 whitespace-nowrap text-[11px] tabular-nums opacity-60">
        {fmt(TRAIL.peakFt)} ft
      </p>
      <p className="absolute -bottom-8 right-0 whitespace-nowrap text-[11px] tabular-nums opacity-60">
        {fmt(BASE_FT)} ft
      </p>

      {/* The ruler: a hairline with a filled part for the climb so far. */}
      <div className="absolute inset-y-0 right-0 w-px bg-current/25" />
      <motion.div
        className="absolute inset-x-auto bottom-0 right-0 h-full w-px origin-bottom bg-current"
        style={{ scaleY: fill }}
      />
      {Array.from({ length: 29 }, (_, i) => (
        <span
          className="absolute right-0 h-px bg-current/30"
          key={i}
          style={{ top: `${((i + 1) / 30) * 100}%`, width: i % 5 === 4 ? 8 : 4 }}
        />
      ))}

      {ticks.map((t, i) => (
        <button
          aria-current={i === active ? "true" : undefined}
          aria-label={`Go to ${t.label}`}
          className="group absolute right-0 flex h-6 w-24 -translate-y-1/2 items-center justify-end"
          key={t.label}
          onClick={() => {
            sfx("select");
            scrollToTarget(t.el);
          }}
          style={{ top: `${(1 - t.at) * 100}%` }}
          type="button"
        >
          <span
            className={`mr-4 whitespace-nowrap text-[11px] transition-[opacity,transform] duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100 ${
              i === active ? "opacity-0" : "translate-x-1 opacity-0"
            }`}
          >
            {t.label}
          </span>
          <span
            className={`h-px transition-[width,background-color] duration-200 ease-out ${
              i <= active ? "w-3.5 bg-current" : "w-2.5 bg-current/50"
            } group-hover:w-5 group-hover:bg-current`}
          />
        </button>
      ))}

      {/* The marker: you, with your altitude. */}
      <motion.div className="absolute right-0 flex -translate-y-1/2 items-center gap-2" style={{ top: markerTop }}>
        <span className="whitespace-nowrap font-display font-bold text-[15px] tabular-nums">
          <NumberFlow format={{ useGrouping: true }} value={feet} />
          <span className="ml-0.5 font-sans font-normal text-[11px] opacity-70">ft</span>
        </span>
        <span className="block size-2.5 translate-x-[5px] rounded-full bg-current ring-4 ring-current/20" />
      </motion.div>
    </motion.nav>
  );
}
