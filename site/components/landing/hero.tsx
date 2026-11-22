"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

import AttractButton from "@/components/kokonutui/attract-button";
import SplitFlapText from "@/components/kokonutui/split-flap-text";
import TopoBackground from "@/components/kokonutui/topo-background";

import { AppleMark } from "./icons";
import { Phone, Shot } from "./phone";
import { RiseWords } from "./reveal";

const BOARD = ["MOUNT SI", "LAKE SERENE", "MAILBOX PEAK", "COLCHUCK LK", "RATTLESNAKE"];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  const phoneY = useTransform(p, [0, 1], [0, reduce ? 0 : 140]);
  const phoneRotate = useTransform(p, [0, 1], [reduce ? 0 : -4, reduce ? 0 : 6]);
  const chipY = useTransform(p, [0, 1], [0, reduce ? 0 : -120]);
  const copyY = useTransform(p, [0, 1], [0, reduce ? 0 : -60]);
  const copyOpacity = useTransform(p, [0, 0.7], [1, 0]);

  return (
    <section className="relative" id="top" ref={ref}>
      <TopoBackground
        className="min-h-[100svh] bg-paper text-climb [&>*]:text-ink"
        interval={34}
        labels
        seed={7}
        speed={0.35}
      >
        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-5 pt-32 pb-20 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8 lg:pt-28">
          <motion.div style={{ y: copyY, opacity: copyOpacity }}>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mb-9 inline-flex items-center gap-3 rounded-2xl border border-line bg-white/80 p-2 pr-3 text-[13px] text-muted-ink shadow-[0_14px_30px_-20px_rgba(28,33,30,0.4)] backdrop-blur"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <SplitFlapText
                className="font-poster font-normal text-[22px] sm:text-[26px]"
                interval={6500}
                words={BOARD}
              />
              <span className="hidden font-medium text-[11px] uppercase leading-tight tracking-[0.16em] sm:block">
                Next
                <br />
                trailhead
              </span>
            </motion.div>

            <h1 className="font-display font-extrabold text-[clamp(3.1rem,8.4vw,7.4rem)] text-ink leading-[0.9] tracking-[-0.045em]">
              <RiseWords text={"Rank every\ntrail you climb."} />
            </h1>

            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 max-w-[34rem] text-[clamp(1.05rem,1.4vw,1.2rem)] text-muted-ink leading-relaxed"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              Apex records your hike, flies you back over it in 3D, and ranks it against every
              trail you&apos;ve done. Your hiking life, finally in order.
            </motion.p>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <AttractButton
                className="h-14 min-w-0 gap-2.5 rounded-full bg-ink px-7 text-[15px] text-paper hover:bg-ink-2"
                containerClassName="[&_canvas]:text-climb"
                radius={80}
              >
                <AppleMark className="size-[18px]" />
                Download now
              </AttractButton>
              <dl className="flex gap-7 text-[13px] text-muted-ink">
                <div>
                  <dt className="block font-display font-bold text-ink text-xl">3D</dt>
                  <dd>flyover of every hike</dd>
                </div>
                <div>
                  <dt className="block font-display font-bold text-ink text-xl">1 list</dt>
                  <dd>every trail, ranked</dd>
                </div>
              </dl>
            </motion.div>
          </motion.div>

          <div className="relative mx-auto w-full max-w-[340px] lg:max-w-[360px]">
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              initial={reduce ? false : { opacity: 0, y: 80, scale: 0.94 }}
              style={{ y: phoneY, rotate: phoneRotate }}
              transition={{ duration: 1.3, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <Phone>
                <Shot alt="The Apex trail page for Angels Landing with its elevation profile" priority src="/screens/light-07-trail-page.png" />
              </Phone>
            </motion.div>

            <motion.div className="pointer-events-none absolute inset-0" style={{ y: chipY }}>
              <FloatChip className="-left-6 top-[52%] sm:-left-28" delay={0.9}>
                <span className="size-2 rounded-full bg-climb" />
                <span className="font-display font-bold text-ink">1,638 ft</span>
                <span className="text-muted-ink">climbed</span>
              </FloatChip>
              <FloatChip className="-right-4 top-[8%] sm:-right-24" delay={1.05}>
                <span className="flex gap-[3px]">
                  {["bg-d1", "bg-d2", "bg-d3", "bg-d4", "bg-d5"].map((c) => (
                    <span className={`h-2 w-3.5 first:rounded-l-full last:rounded-r-full ${c}`} key={c} />
                  ))}
                </span>
                <span className="font-medium text-ink">Very strenuous</span>
              </FloatChip>
              <FloatChip className="-right-2 bottom-[14%] sm:-right-20" delay={1.2}>
                <span className="grid size-6 place-items-center rounded-full bg-streak font-display font-bold text-[11px] text-white">
                  #2
                </span>
                <span className="font-medium text-ink">Loved</span>
                <span className="text-muted-ink">· 9.0</span>
              </FloatChip>
            </motion.div>
          </div>
        </div>
      </TopoBackground>
    </section>
  );
}

function FloatChip({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={`absolute flex items-center gap-2 whitespace-nowrap rounded-2xl border border-line/80 bg-white/90 px-3.5 py-2.5 text-[13px] shadow-[0_18px_40px_-18px_rgba(28,33,30,0.35)] backdrop-blur-md ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.8, y: 20 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
    >
      <motion.span
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        className="flex items-center gap-2"
        transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay }}
      >
        {children}
      </motion.span>
    </motion.div>
  );
}
