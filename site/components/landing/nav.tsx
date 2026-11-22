"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";

import { AppleMark, Peak } from "./icons";

const LINKS = [
  { href: "#record", label: "Record" },
  { href: "#flyover", label: "Flyover" },
  { href: "#rank", label: "Rank" },
  { href: "#friends", label: "Friends" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 640 && y > prev + 4);
    if (y < prev - 4) setHidden(false);
  });

  return (
    <motion.header
      animate={{ y: hidden ? -96 : 0 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
      initial={reduce ? false : { y: -96 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
    >
      <motion.nav
        animate={{
          maxWidth: scrolled ? 760 : 1240,
          paddingLeft: scrolled ? 10 : 6,
          backgroundColor: scrolled ? "rgba(255,255,255,0.78)" : "rgba(255,255,255,0)",
          borderColor: scrolled ? "rgba(221,212,194,0.9)" : "rgba(221,212,194,0)",
          boxShadow: scrolled ? "0 18px 40px -24px rgba(28,33,30,0.35)" : "0 0 0 rgba(0,0,0,0)",
        }}
        aria-label="Main"
        className="flex w-full items-center justify-between gap-4 rounded-full border py-1.5 pr-1.5 backdrop-blur-xl"
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
      >
        <a className="flex items-center gap-2 pl-2 font-display font-extrabold text-[22px] text-ink tracking-[-0.03em]" href="#top">
          <Peak className="size-7 text-ink" />
          Apex
        </a>
        <ul className="hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
          {LINKS.map((l) => (
            <li className="relative" key={l.href}>
              {hovered === l.href && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-raised"
                  layoutId="nav-hover"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <a
                className="relative block px-4 py-2 font-medium text-[14px] text-ink-2"
                href={l.href}
                onMouseEnter={() => setHovered(l.href)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <button
          className="group flex h-10 items-center gap-2 rounded-full bg-ink px-4 font-medium text-[14px] text-paper transition-transform duration-200 active:scale-95"
          type="button"
        >
          <AppleMark className="size-4 transition-transform duration-300 group-hover:-rotate-12" />
          Download now
        </button>
      </motion.nav>
    </motion.header>
  );
}
