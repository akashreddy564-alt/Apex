"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { useRef } from "react";

import TopoBackground from "@/components/kokonutui/topo-background";
import { TRAILS } from "@/lib/trails";

import { SmoothScroll } from "./smooth";

/** Scroll speed, smoothed, shared by everything that reacts to it. */
function useScrollSpeed() {
  const { scrollY } = useScroll();
  const v = useVelocity(scrollY);
  return useSpring(v, { stiffness: 220, damping: 40 });
}

export function OptionB() {
  const speed = useScrollSpeed();
  // The contour map shears and stretches the faster you scroll.
  const skew = useTransform(speed, [-3000, 0, 3000], [7, 0, -7]);
  const stretch = useTransform(speed, [-3000, 0, 3000], [1.18, 1, 1.18]);

  return (
    <main className="bg-paper text-ink">
      <SmoothScroll lerp={0.06} />

      <section className="relative h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-[-10%]" style={{ skewY: skew, scaleY: stretch }}>
          <TopoBackground className="h-full min-h-0 bg-paper text-climb" interval={26} seed={3} speed={0.4}>
            {null}
          </TopoBackground>
        </motion.div>
        <div className="relative grid h-full place-items-center px-6 text-center">
          <div>
            <p className="mb-6 font-medium text-[13px] text-muted-ink">Option B · velocity and type · scroll fast</p>
            <h1 className="font-display font-extrabold text-[clamp(3rem,8vw,6rem)] leading-[0.92] tracking-[-0.035em]">
              Rank every
              <br />
              trail you climb.
            </h1>
          </div>
        </div>
      </section>

      <Marquee speed={speed} />
      <GiantType />
      <Iris />
      <PhotoZoom />
      <section className="grid min-h-[60svh] place-items-center bg-ink px-6 text-center text-paper">
        <p className="font-display font-extrabold text-[clamp(2rem,5vw,4rem)] tracking-[-0.035em]">Your next summit is already waiting.</p>
      </section>
    </main>
  );
}

/** Trail names drifting sideways; scrolling throws them faster, either way. */
function Marquee({ speed }: { speed: ReturnType<typeof useScrollSpeed> }) {
  const x = useMotionValue(0);
  const row = useRef<HTMLDivElement>(null);
  useAnimationFrame((_, delta) => {
    const w = (row.current?.scrollWidth ?? 2000) / 2;
    const boost = 1 + Math.min(6, Math.abs(speed.get()) / 400);
    const dir = speed.get() < -50 ? -1 : 1;
    let next = x.get() - dir * (delta / 1000) * 60 * boost;
    if (next < -w) next += w;
    if (next > 0) next -= w;
    x.set(next);
  });
  const names = TRAILS.map((t) => `${t.name} · ${t.gainFt.toLocaleString("en-US")} ft`);
  return (
    <section className="overflow-hidden border-line border-y bg-white py-8">
      <motion.div className="flex w-max gap-12 whitespace-nowrap font-display font-extrabold text-[clamp(2rem,5vw,4.5rem)] tracking-[-0.03em]" ref={row} style={{ x }}>
        {[...names, ...names].map((n, i) => (
          <span className={i % 2 ? "text-climb" : "text-ink"} key={i}>
            {n} <span className="text-line">✦</span>
          </span>
        ))}
      </motion.div>
    </section>
  );
}

/** One huge line of type pinned over a photo, dragged across by the scrollbar. */
function GiantType() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["15%", "-100%"]);
  const photo = useTransform(scrollYProgress, [0, 1], [1.15, 1]);
  return (
    <section className="relative h-[300vh]" ref={ref}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden bg-[#0c0e0d]">
        <motion.img alt="" className="absolute inset-0 size-full object-cover opacity-50" src="/photos/mount-rainier.jpg" style={{ scale: photo }} />
        <motion.p className="relative whitespace-nowrap font-display font-extrabold text-[clamp(6rem,19vw,20rem)] text-paper leading-none tracking-[-0.04em] mix-blend-difference" style={{ x }}>
          3,350 FT OF CLIMB
        </motion.p>
      </div>
    </section>
  );
}

/** The next section opens through a circle that grows with the scroll. */
function Iris() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const r = useTransform(scrollYProgress, [0.05, 0.75], [0, 150]);
  const clip = useTransform(r, (v) => `circle(${v}% at 50% 55%)`);
  const ringScale = useTransform(scrollYProgress, [0, 0.75], [0.6, 1.2]);
  return (
    <section className="relative h-[250vh]" ref={ref}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-paper">
        <div className="grid h-full place-items-center px-6 text-center">
          <p className="font-display font-extrabold text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">
            Better than Lake Serene?
            <br />
            <span className="text-muted-ink">Keep scrolling.</span>
          </p>
        </div>
        <motion.div className="absolute inset-0 grid place-items-center bg-forest px-6 text-center text-paper" style={{ clipPath: clip }}>
          <motion.div style={{ scale: ringScale }}>
            <p className="font-display font-extrabold text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">
              You decide.
              <br />
              <span className="text-paper/70">#1 Mount Si · #2 Colchuck Lake</span>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/** Fly through the photo: it pushes in as you scroll while the headline holds. */
function PhotoZoom() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 2.2]);
  const fade = useTransform(scrollYProgress, [0.55, 0.9], [1, 0]);
  return (
    <section className="relative h-[250vh]" ref={ref}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-[#0c0e0d]">
        <motion.img alt="" className="absolute inset-0 size-full origin-[50%_35%] object-cover" src="/photos/mount-rainier.jpg" style={{ scale }} />
        <motion.div className="absolute inset-0 grid place-items-center bg-black/30 px-6 text-center text-paper" style={{ opacity: fade }}>
          <p className="font-display font-extrabold text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">Then fly back over every step.</p>
        </motion.div>
      </div>
    </section>
  );
}
