"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Fades content up out of a slight blur the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Splits a headline into words that rise in one after another. */
export function RiseWords({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const lines = text.split("\n");
  let index = 0;
  return (
    <span className={className}>
      <span className="sr-only">{text.replace("\n", " ")}</span>
      {lines.map((line, li) => (
        <span aria-hidden className="block" key={li}>
          {line.split(" ").map((word, wi) => {
            const i = index++;
            return (
              <span className="inline-block overflow-hidden pb-[0.12em] align-bottom" key={wi}>
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { y: "110%", rotate: 4 }}
                  whileInView={{ y: "0%", rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  {word}
                  {wi < line.split(" ").length - 1 ? " " : ""}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/** Small uppercase label above a section headline. */
export function Eyebrow({ children, tone = "text-climb" }: { children: ReactNode; tone?: string }) {
  return (
    <p className={`mb-5 flex items-center gap-2.5 font-medium text-[12px] uppercase tracking-[0.22em] ${tone}`}>
      <span className="h-px w-6 bg-current opacity-60" />
      {children}
    </p>
  );
}
