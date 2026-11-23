"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { motion } from "motion/react";
import { useState } from "react";

import { Gauge } from "@/components/charts/gauge";
import { TRAILS } from "@/lib/trails";

import { H2 } from "./reveal";
import NumberFlow from "@number-flow/react";
import { sfx } from "./sound";

const RAMP = ["#2F7A4A", "#7E9A3C", "#C99A2E", "#C2672B", "#8E3B24"];
const LABELS = ["Easiest", "Moderate", "Mod. strenuous", "Strenuous", "Very strenuous"];
const MAX = 300;
// NPS Shenandoah band edges (50, 100, 150, 200) on a 0–300 dial.
const ZONES = [0, 50, 100, 150, 200, MAX].slice(0, 5).map((from, i, a) => ({
  from: (from / MAX) * 100,
  to: ((a[i + 1] ?? MAX) / MAX) * 100,
  color: RAMP[i],
}));

const ORDER = [2, 1, 4, 0, 3]; // Rattlesnake, Serene, Colchuck, Si, Mailbox

export function Difficulty() {
  const [pick, setPick] = useState(ORDER[3]);
  const t = TRAILS[pick];

  return (
    <section className="relative border-line border-y bg-white py-28 sm:py-36" id="difficulty">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className={`${H2} text-ink`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Know how hard before you go.
            </WordsStagger>
          </h2>
          <div>
            <p className="mt-6 max-w-[34rem] text-[1.075rem] text-muted-ink leading-relaxed [text-wrap:pretty]">
              Every trail gets the National Park Service&apos;s Shenandoah rating, worked out from
              its distance and climb. Five steps, from forest green to red-brown.
            </p>
          </div>
          <div>
            <div className="mt-10 flex flex-wrap gap-1" role="tablist" aria-label="Trails">
              {ORDER.map((i) => {
                const on = i === pick;
                return (
                  <button
                    aria-selected={on}
                    className="press relative h-11 rounded-full px-4 font-medium text-[14px]"
                    key={TRAILS[i].name}
                    onClick={() => {
                      sfx("select");
                      setPick(i);
                    }}
                    role="tab"
                    type="button"
                  >
                    {on && (
                      <motion.span
                        className="absolute inset-0 rounded-full bg-ink"
                        layoutId="diff-tab"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span className={`relative ${on ? "text-paper" : "text-ink-2"}`}>{TRAILS[i].name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-[2rem] border border-line bg-paper/60 p-6 sm:p-10">
            <div className="mx-auto max-w-[420px]">
              <Gauge
                centerValue={t.score}
                activeGradient={["#2F7A4A", "#8E3B24"]}
                defaultLabel="on the NPS scale"
                inactiveFill="#E4DCCB"
                useGradient
                value={(Math.min(t.score, MAX) / MAX) * 100}
                zones={ZONES}
              />
            </div>
            {/* The app's segmented pill, ringed at this trail's step. */}
            <div className="mx-auto mt-6 max-w-[420px]">
              <div className="flex items-center gap-[3px]">
                {RAMP.map((c, i) => (
                  <div className="relative h-2.5 flex-1" key={c}>
                    <div
                      className={`size-full ${i === 0 ? "rounded-l-full" : ""} ${i === 4 ? "rounded-r-full" : ""}`}
                      style={{ background: i <= t.level ? c : "#EAE3D4", transition: "background .5s" }}
                    />
                    {i === t.level && (
                      <motion.div
                        className="absolute -inset-[4px] rounded-[5px] border-2 border-ink"
                        layoutId="diff-ring"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-muted-ink">
                <span>{LABELS[0]}</span>
                <span>{LABELS[4]}</span>
              </div>
              <p className="mt-6 text-center text-[15px] text-muted-ink">
                <b className="font-semibold text-ink">{t.label}</b> ·{" "}
                <span className="text-distance tabular-nums">
                  <NumberFlow format={{ minimumFractionDigits: 1 }} value={t.miles} /> mi
                </span>{" "}
                ·{" "}
                <span className="text-climb tabular-nums">
                  <NumberFlow value={t.gainFt} /> ft
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
