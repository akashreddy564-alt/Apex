"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Phone, Shot } from "./phone";

const SCREENS = [
  { src: "/screens/light-01-opening.png", title: "Opening", note: "A famous summit every time you open it" },
  { src: "/screens/light-02-home.png", title: "Home", note: "Your week, your streak, your weekend pick" },
  { src: "/screens/light-13-recording.png", title: "Recording", note: "Live route, distance and climb" },
  { src: "/screens/light-07-trail-page.png", title: "Trail", note: "Difficulty, profile and your history" },
  { src: "/screens/light-04-rankings.png", title: "Rankings", note: "Every trail you've done, in order" },
  { src: "/screens/dark-12-flyover-end.png", title: "Flyover", note: "Your hike in 3D, ready to share" },
  { src: "/screens/light-09-goal.png", title: "Goal", note: "A weekly target in miles or feet" },
  { src: "/screens/light-03-log.png", title: "Log", note: "Every hike, every foot" },
];

/** Pinned while you scroll: the screens slide past sideways. */
export function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.3 });
  const x = useTransform(p, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useEffect(() => {
    const measure = () => {
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  if (reduce) {
    return (
      <section className="py-28" id="screens">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {SCREENS.map((s) => (
              <Phone key={s.src}>
                <Shot alt={`Apex ${s.title} screen: ${s.note.toLowerCase()}`} src={s.src} />
              </Phone>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative" id="screens" ref={ref} style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto mb-10 flex w-full max-w-7xl items-end justify-between gap-6 px-5 sm:px-8">
          <div>
            <h2 className="font-display font-extrabold text-[clamp(2rem,4vw,3.4rem)] text-ink leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Every screen, made for the trail.
            </WordsStagger>
          </h2>
          </div>
          <div aria-hidden className="hidden h-1 w-40 overflow-hidden rounded-full bg-raised sm:block">
            <motion.div className="h-full origin-left bg-climb" style={{ scaleX: bar }} />
          </div>
        </div>
        <motion.div className="flex w-max gap-6 px-5 sm:gap-10 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]" ref={track} style={{ x }}>
          {SCREENS.map((s) => (
            <div className="w-[min(62vw,250px)] shrink-0" key={s.src}>
              <Phone>
                <Shot alt={`Apex ${s.title} screen: ${s.note.toLowerCase()}`} src={s.src} />
              </Phone>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
