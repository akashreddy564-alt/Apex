"use client";

import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useInView, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef, useState } from "react";

import FlowField from "@/components/kokonutui/flow-field";
import InkBackground from "@/components/kokonutui/ink-background";
import { fmt, routePath } from "@/components/landing/route";
import { TRAILS, type Trail } from "@/lib/trails";

const RAMP = ["#2F7A4A", "#7E9A3C", "#C99A2E", "#C2672B", "#8E3B24"];

export function Effects() {
  return (
    <main className="bg-paper text-ink">
      <Label n="1" text="Letters assemble" />
      <Letters />
      <Label n="2" text="Counter rolls" />
      <Counters />
      <Label n="3" text="Flow field background (Kokonut)" />
      <section className="relative h-[100svh] overflow-hidden bg-[#0c0e0d] text-[#d9925e]">
        <FlowField className="opacity-70" interactive speed={1} />
        <div className="relative grid h-full place-items-center px-6 text-center text-paper">
          <p className="font-display font-extrabold text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">
            Then fly back
            <br />
            over every step.
          </p>
        </div>
      </section>
      <Label n="4" text="Ink background (Kokonut): drag through it" />
      <InkBackground accent="#94552A" className="min-h-[100svh] bg-paper text-ink" text="Your next summit is already waiting." />
      <Label n="5" text="Cursor spotlight" />
      <Spotlight />
      <Label n="6" text="Morphing trail cards: click one" />
      <Morph />
      <div className="h-24" />
    </main>
  );
}

function Label({ n, text }: { n: string; text: string }) {
  return (
    <div className="border-line border-t bg-white px-6 py-4 font-medium text-[13px] text-muted-ink">
      Effect {n} · {text}
    </div>
  );
}

/** Each letter drops into place from a scattered, tilted start. */
function Letters() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-30% 0px" });
  const words = "Your next summit is already waiting.".split(" ");
  let k = 0;
  return (
    <section className="grid min-h-[90svh] place-items-center bg-ink px-6 text-center text-paper">
      <div ref={ref}>
        <p aria-label="Your next summit is already waiting." className="max-w-5xl font-display font-extrabold text-[clamp(3rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.035em]">
          {words.map((w, wi) => (
            <span aria-hidden className="inline-block whitespace-nowrap" key={wi}>
              {[...w].map((ch) => {
                const i = k++;
                const seed = Math.sin(i * 12.9898) * 43758.5453;
                // Rounded so the server and the browser agree on the starting pose.
                const r = Math.round((seed - Math.floor(seed)) * 100) / 100;
                return (
                  <motion.span
                    animate={inView ? { opacity: 1, x: 0, y: 0, rotate: 0, filter: "blur(0px)" } : undefined}
                    className="inline-block"
                    initial={{ opacity: 0, x: (r - 0.5) * 240, y: -80 - r * 160, rotate: (r - 0.5) * 70, filter: "blur(6px)" }}
                    key={i}
                    transition={{ type: "spring", duration: 0.9, bounce: 0.18, delay: i * 0.022 }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
              {wi < words.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

/** Stats roll up digit by digit when they come into view, like the app's odometer. */
function Counters() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-30% 0px" });
  const t = TRAILS[0];
  const stats = [
    { label: "Miles", value: inView ? t.miles : 0, tone: "text-distance", format: { minimumFractionDigits: 1 } },
    { label: "Feet climbed", value: inView ? t.gainFt : 0, tone: "text-climb", format: {} },
    { label: "NPS score", value: inView ? t.score : 0, tone: "text-ink", format: {} },
  ];
  return (
    <section className="grid min-h-[70svh] place-items-center px-6" ref={ref}>
      <div className="grid gap-10 sm:grid-cols-3 sm:gap-16">
        {stats.map((s) => (
          <div className="text-center" key={s.label}>
            <p className={`font-display font-extrabold text-[clamp(3.5rem,8vw,6rem)] leading-none tabular-nums ${s.tone}`}>
              <NumberFlow format={s.format} transformTiming={{ duration: 1200, easing: "cubic-bezier(0.23,1,0.32,1)" }} value={s.value} />
            </p>
            <p className="mt-3 text-muted-ink">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A soft light follows the pointer and lights up contour lines in the dark. */
function Spotlight() {
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  const x = useSpring(mx, { stiffness: 200, damping: 30 });
  const y = useSpring(my, { stiffness: 200, damping: 30 });
  const mask = useMotionTemplate`radial-gradient(260px circle at ${x}px ${y}px, #000 0%, transparent 70%)`;
  const glow = useMotionTemplate`radial-gradient(420px circle at ${x}px ${y}px, rgba(217,146,94,0.18), transparent 70%)`;
  const rings = (stroke: string, opacity: number) => (
    <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 800">
      {Array.from({ length: 26 }, (_, i) => (
        <ellipse cx={600 + Math.sin(i) * 20} cy={420} fill="none" key={i} rx={40 + i * 34} ry={26 + i * 24} stroke={stroke} strokeOpacity={opacity} strokeWidth={i % 5 === 4 ? 1.6 : 0.9} transform="rotate(-12 600 420)" />
      ))}
    </svg>
  );
  return (
    <section
      className="relative h-[90svh] overflow-hidden bg-[#0c0e0d]"
      onPointerLeave={() => {
        mx.set(-999);
        my.set(-999);
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
    >
      {rings("#F5F1E8", 0.06)}
      <motion.div className="absolute inset-0" style={{ background: glow }} />
      <motion.div className="absolute inset-0" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        {rings("#d9925e", 0.9)}
      </motion.div>
      <div className="pointer-events-none relative grid h-full place-items-center px-6 text-center text-paper">
        <p className="font-display font-extrabold text-[clamp(2.4rem,6vw,5rem)] leading-[0.95] tracking-[-0.035em]">
          Move your cursor
          <br />
          over the map.
        </p>
      </div>
    </section>
  );
}

/** Click a trail and its card grows into the trail page; close and it folds back. */
function Morph() {
  const [open, setOpen] = useState<Trail | null>(null);
  const trails = TRAILS.slice(0, 3);
  return (
    <section className="relative min-h-[90svh] px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
        {trails.map((t) => (
          <motion.button
            className="press rounded-3xl bg-white p-3 text-left shadow-[0_0_0_1px_rgba(28,33,30,0.07),0_20px_40px_-28px_rgba(28,33,30,0.45)]"
            key={t.name}
            layoutId={`card-${t.name}`}
            onClick={() => setOpen(t)}
            type="button"
          >
            <motion.div className="aspect-[4/3] overflow-hidden rounded-2xl" layoutId={`art-${t.name}`}>
              <Art trail={t} />
            </motion.div>
            <motion.p className="mt-3 px-1 font-display font-bold text-lg" layoutId={`title-${t.name}`}>
              {t.name}
            </motion.p>
            <p className="px-1 text-[13px] text-muted-ink">
              <span className="text-distance">{t.miles} mi</span> · <span className="text-climb">{fmt(t.gainFt)} ft</span>
            </p>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[60] bg-ink/40" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={() => setOpen(null)} />
            <motion.div className="fixed inset-4 z-[61] mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-white sm:inset-10" layoutId={`card-${open.name}`} transition={{ type: "spring", duration: 0.55, bounce: 0.1 }}>
              <motion.div className="h-[55%] overflow-hidden" layoutId={`art-${open.name}`}>
                <Art trail={open} />
              </motion.div>
              <div className="p-6">
                <motion.p className="font-display font-extrabold text-4xl tracking-[-0.03em]" layoutId={`title-${open.name}`}>
                  {open.name}
                </motion.p>
                <motion.p animate={{ opacity: 1, y: 0 }} className="mt-2 text-muted-ink" initial={{ opacity: 0, y: 8 }} transition={{ delay: 0.2 }}>
                  {open.region} · {open.miles} mi round trip · {fmt(open.gainFt)} ft · <b style={{ color: RAMP[open.level] }}>{open.label}</b>
                </motion.p>
                <button className="press mt-6 h-11 rounded-full bg-ink px-5 text-paper" onClick={() => setOpen(null)} type="button">
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

function Art({ trail }: { trail: Trail }) {
  const { d } = routePath(trail, 400, 40);
  return (
    <svg className="size-full bg-paper" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 400">
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse cx={200} cy={190} fill="none" key={i} rx={30 + i * 30} ry={22 + i * 24} stroke="#94552A" strokeOpacity={0.14} />
      ))}
      <path d={d} fill="none" stroke="#1C211E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
    </svg>
  );
}
