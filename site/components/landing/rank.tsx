"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import CardStack, { type DeckCard } from "@/components/kokonutui/card-stack";
import { TRAILS, type Trail } from "@/lib/trails";

import { H2, Step } from "./reveal";
import { fmt, routePath } from "./route";
import { sfx } from "./sound";

const RAMP = ["#2F7A4A", "#7E9A3C", "#C99A2E", "#C2672B", "#8E3B24"];

/** A trail as a little map card: contour paper, its route, and its profile. */
function TrailArt({ trail, seed }: { trail: Trail; seed: number }) {
  const { d } = routePath(trail, 320, 46);
  const max = Math.max(...trail.profile.map((p) => p[1]));
  const min = Math.min(...trail.profile.map((p) => p[1]));
  const last = trail.profile[trail.profile.length - 1][0];
  const profile = trail.profile
    .map(([m, f], i) => `${i ? "L" : "M"}${((m / last) * 320).toFixed(1)} ${(400 - 14 - ((f - min) / (max - min || 1)) * 74).toFixed(1)}`)
    .join(" ");
  return (
    <svg aria-hidden className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 30 320 340">
      <rect fill="#F5F1E8" height="400" width="320" />
      {Array.from({ length: 9 }, (_, i) => (
        <ellipse
          cx={160 + Math.sin(seed + i) * 18}
          cy={170 + Math.cos(seed * 2 + i) * 14}
          fill="none"
          key={i}
          rx={30 + i * 22}
          ry={22 + i * 17}
          stroke="#94552A"
          strokeOpacity={i % 4 === 3 ? 0.3 : 0.13}
          transform={`rotate(${seed * 23} 160 170)`}
        />
      ))}
      <path d={d} fill="none" stroke="#1C211E" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" transform="translate(0 -14)" />
      <path d={`${profile} L320 400 L0 400Z`} fill="#94552A" fillOpacity="0.14" />
      <path d={profile} fill="none" stroke="#94552A" strokeWidth="2" />
    </svg>
  );
}

const BASE = ["Mount Si", "Mailbox Peak", "Lake Serene", "Rattlesnake Ledge"];
const NEW = "Colchuck Lake";
const STEPS = [
  { vs: "Lake Serene", answer: "Better" },
  { vs: "Mailbox Peak", answer: "Better" },
  { vs: "Mount Si", answer: "Not quite" },
] as const;

export function Rank() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px" });
  const [step, setStep] = useState(reduce ? STEPS.length + 1 : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setTimeout(() => {
      const next = step >= STEPS.length + 2 ? 0 : step + 1;
      if (next >= 1 && next <= STEPS.length) sfx("select");
      if (next === STEPS.length + 1) sfx("success");
      setStep(next);
    }, step === 0 ? 900 : 1700);
    return () => window.clearTimeout(id);
  }, [inView, reduce, step]);

  const placed = step > STEPS.length;
  const list = placed ? [BASE[0], NEW, ...BASE.slice(1)] : BASE;
  const asking = !placed && step > 0 ? STEPS[step - 1] : null;

  const cards: DeckCard[] = useMemo(
    () =>
      TRAILS.map((t, i) => ({
        id: t.name,
        title: t.name,
        subtitle: t.region ?? "Washington",
        art: (
          <>
            <TrailArt seed={i + 1} trail={t} />
            <span
              className="absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 font-semibold text-[11px] text-white"
              style={{ background: RAMP[t.level] }}
            >
              {t.label}
            </span>
          </>
        ),
        description: `${t.miles} miles round trip with ${fmt(t.gainFt)} ft of climbing to a ${fmt(t.peakFt)} ft high point. ${t.label} on the NPS scale (${t.score}).`,
        specs: [
          { label: "Distance", value: `${t.miles} mi` },
          { label: "Climb", value: `${fmt(t.gainFt)} ft` },
          { label: "NPS score", value: String(t.score) },
        ],
        price: `${t.miles} mi`,
      })),
    []
  );

  return (
    <section className="relative py-28 sm:py-36" id="rank">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-16">
          <div>
            <Step n={3} />
            <h2 className={`${H2} text-ink`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Better than Lake Serene? You decide.
            </WordsStagger>
          </h2>
          </div>
          <p className="max-w-[34rem] text-[1.075rem] text-muted-ink leading-relaxed [text-wrap:pretty] lg:mb-2">
            No star ratings. Apex asks a few quick this-or-that questions and slots each hike into
            your own list, so your #1 actually means something.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2" ref={ref}>
          <div>
            <div className="relative rounded-[2rem] border border-line bg-[radial-gradient(circle_at_50%_40%,#fff,#F5F1E8_70%)]">
              <p className="absolute top-5 left-6 font-medium text-[13px] text-muted-ink">
                Your hikes · flick through
              </p>
              <CardStack accent="#1C211E" actionLabel="Rank it" cards={cards} className="min-h-[34rem]" onChange={() => sfx("swipe")} />
            </div>
          </div>

          <div>
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-[0_40px_80px_-50px_rgba(28,33,30,0.4)] sm:p-8">
              <div className="flex items-center justify-between">
                <p className="font-display font-bold text-ink text-xl">Your rankings</p>
                <p className="text-[13px] text-muted-ink">{list.length} trails</p>
              </div>

              <div className="relative mt-5 h-[76px]">
                <AnimatePresence mode="popLayout">
                  {asking ? (
                    <motion.div
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 text-paper"
                      exit={{ opacity: 0, y: -14, scale: 0.97 }}
                      initial={{ opacity: 0, y: 14, scale: 0.97 }}
                      key={asking.vs}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    >
                      <span className="text-[15px]">
                        <span className="text-paper/60">{NEW} vs</span> <b className="font-semibold">{asking.vs}</b>
                      </span>
                      <motion.span
                        animate={{ opacity: 1, scale: 1 }}
                        className={`rounded-full px-3 py-1 font-semibold text-[13px] ${asking.answer === "Better" ? "bg-streak text-white" : "bg-paper text-ink"}`}
                        initial={{ opacity: 0, scale: 0.6 }}
                        transition={{ delay: 0.55, type: "spring", stiffness: 500, damping: 22 }}
                      >
                        {asking.answer}
                      </motion.span>
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex items-center gap-3 rounded-2xl border border-line border-dashed px-5 text-[15px] text-muted-ink"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key={placed ? "placed" : "idle"}
                    >
                      {placed ? (
                        <>
                          <span className="size-2 rounded-full bg-streak" /> {NEW} lands at <b className="text-ink">#2</b>
                        </>
                      ) : (
                        <>
                          <span className="size-2 animate-pulse rounded-full bg-climb" /> New hike: {NEW}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <LayoutGroup>
                <ol className="mt-5 space-y-2">
                  {list.map((name, i) => {
                    const t = TRAILS.find((x) => x.name === name)!;
                    const fresh = name === NEW;
                    return (
                      <motion.li
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${fresh ? "border-streak/40 bg-streak/[0.07]" : "border-line bg-paper/50"}`}
                        initial={fresh ? { opacity: 0, scale: 0.9 } : false}
                        key={name}
                        layout
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      >
                        <motion.span
                          className={`w-7 font-display font-extrabold text-2xl tabular-nums ${i === 0 ? "text-streak" : "text-ink"}`}
                          layout="position"
                        >
                          {i + 1}
                        </motion.span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-[15px] text-ink">{name}</span>
                          <span className="block text-[13px]">
                            <span className="text-distance">{t.miles} mi</span>
                            <span className="text-muted-ink"> · </span>
                            <span className="text-climb">{fmt(t.gainFt)} ft</span>
                          </span>
                        </span>
                        <span className="h-2 w-10 rounded-full" style={{ background: RAMP[t.level] }} />
                      </motion.li>
                    );
                  })}
                </ol>
              </LayoutGroup>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
