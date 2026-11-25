"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState, useSyncExternalStore } from "react";

import { AppleMark, Peak } from "./icons";
import { scrollToTarget } from "./smooth";
import { onSoundChange, setSound, sfx, soundOn } from "./sound";

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
          backgroundColor: scrolled ? "rgba(245,241,232,0.94)" : "rgba(255,255,255,0)",
          borderColor: scrolled ? "rgba(221,212,194,0.9)" : "rgba(221,212,194,0)",
          boxShadow: scrolled ? "0 18px 40px -24px rgba(28,33,30,0.35)" : "0 0 0 rgba(0,0,0,0)",
        }}
        aria-label="Main"
        className="flex w-full items-center justify-between gap-4 rounded-full border py-1.5 pr-1.5"
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
      >
        <a className="flex h-11 items-center gap-2 pl-2 font-display font-extrabold text-[22px] text-ink tracking-[-0.03em]" href="#top">
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
                className="relative flex h-11 items-center px-4 font-medium text-[14px] text-ink-2"
                href={l.href}
                onClick={(e) => {
                  const el = document.getElementById(l.href.slice(1));
                  if (!el) return;
                  e.preventDefault();
                  scrollToTarget(el);
                }}
                onMouseEnter={() => setHovered(l.href)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
        <SoundToggle />
        <button
          className="press group flex h-11 items-center gap-2 rounded-full bg-ink px-4 font-medium text-[14px] text-paper"
          onClick={() => sfx("press")}
          type="button"
        >
          <AppleMark className="size-4 transition-transform duration-300 group-hover:-rotate-12" />
          Download now
        </button>
        </div>
      </motion.nav>
    </motion.header>
  );
}

/** Sound is off until the visitor turns it on; the choice is remembered. */
function SoundToggle() {
  const on = useSyncExternalStore(onSoundChange, soundOn, () => false);
  return (
    <button
      aria-label={on ? "Turn interface sounds off" : "Turn interface sounds on"}
      aria-pressed={on}
      className="press grid size-11 place-items-center rounded-full text-ink-2 hover:bg-raised"
      onClick={() => void setSound(!on)}
      type="button"
    >
      <svg aria-hidden className="size-[18px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M4 9.5h3l4.5-4v13l-4.5-4H4z" fill="currentColor" stroke="none" />
        {on ? (
          <>
            <path d="M15.5 9a4 4 0 0 1 0 6" />
            <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : (
          <path d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  );
}
