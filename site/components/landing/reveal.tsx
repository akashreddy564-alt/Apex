"use client";

import { motion, useReducedMotion } from "motion/react";

/** Strong ease-out (Emil Kowalski's curve): instant response, long settle. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Shared section heading: one scale, balanced lines, tracking at the -0.035em floor. */
export const H2 =
  "font-display font-extrabold text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.98] tracking-[-0.035em] [text-wrap:balance]";

/**
 * The hero's headline, played once on load. Words rise out of a mask with
 * slightly uneven delays so the line reads as one gesture, not a metronome.
 */
export function HeroWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const lines = text.split("\n");
  let index = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text.replace("\n", " ")}</span>
      {lines.map((line, li) => (
        <span aria-hidden className="block" key={li}>
          {line.split(" ").map((word, wi, all) => {
            const i = index++;
            return (
              <span className="inline-block overflow-hidden pb-[0.1em] align-bottom" key={wi}>
                <motion.span
                  animate={{ y: "0%" }}
                  className="inline-block"
                  initial={reduce ? false : { y: "105%" }}
                  transition={{ duration: 0.9, delay: delay + i * 0.055 + (li ? 0.04 : 0), ease: EASE_OUT }}
                >
                  {word}
                  {wi < all.length - 1 ? " " : ""}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

const STEPS = ["Record", "Fly back", "Rank"] as const;

/**
 * The page's one numbered sequence: a hike's three steps, marked like trail
 * blazes. Only the Record, Flyover and Rank sections carry it.
 */
export function Step({ n, dark = false }: { n: 1 | 2 | 3; dark?: boolean }) {
  return (
    <p
      aria-label={`Step ${n} of 3: ${STEPS[n - 1]}`}
      className={`mb-6 flex items-center gap-3 font-medium text-[13px] ${dark ? "text-paper/70" : "text-muted-ink"}`}
    >
      <span aria-hidden className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            className={`h-[7px] rounded-[2px] ${i + 1 === n ? "w-6 bg-climb" : i + 1 < n ? "w-[7px] bg-climb/45" : `w-[7px] ${dark ? "bg-paper/20" : "bg-line"}`} ${dark && i + 1 === n ? "!bg-[#d9925e]" : ""}`}
            key={s}
          />
        ))}
      </span>
      <span>
        <span className={dark ? "text-paper" : "text-ink"}>{STEPS[n - 1]}</span>
        <span aria-hidden> · {n} of 3</span>
      </span>
    </p>
  );
}
