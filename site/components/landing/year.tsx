"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import ActivityTerrain from "@/components/kokonutui/activity-terrain";

import { H2 } from "./reveal";

/** A believable year of hikes: weekends, long summer days, a quiet winter. */
function yearOfHikes() {
  let s = 11;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const end = new Date(Date.UTC(2026, 10, 21));
  const days: number[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    const dow = d.getUTCDay();
    const month = d.getUTCMonth();
    const season = month >= 5 && month <= 8 ? 1 : month === 4 || month === 9 ? 0.6 : 0.22;
    const weekend = dow === 0 || dow === 6 ? 1 : 0.18;
    const p = season * weekend;
    days.push(rand() < p ? Math.ceil(rand() * 4 * season + 0.5) : 0);
  }
  return days;
}

const DATA = yearOfHikes();

export function Year() {
  const data = DATA;
  const total = data.filter(Boolean).length;
  return (
    <section className="relative overflow-hidden bg-forest py-28 text-paper sm:py-36" id="year">
      <ContourField />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <h2 className={`${H2} text-paper`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              A year you can turn in your hand.
            </WordsStagger>
          </h2>
          </div>
          <div>
            <p className="max-w-lg text-[1.075rem] text-paper/80 leading-relaxed [text-wrap:pretty] lg:mb-2">
              Set a weekly goal in miles or feet and keep the streak green. Every hike raises the
              ground: {total} days out this year, drawn as terrain. Drag it to turn.
            </p>
          </div>
        </div>
        <div className="mt-14 flex justify-center">
          <ActivityTerrain
            className="max-w-4xl border-0 bg-white shadow-[0_50px_100px_-40px_rgba(0,0,0,0.55)] [--terrain-0:#EAE3D4] [--terrain-1:#BFD3AE] [--terrain-2:#7FB08F] [--terrain-3:#2F7A4A] [--terrain-4:#1B4D2E] [--terrain-accent:#94552A] [--terrain-text:#8A877D]"
            data={data}
            endDate="2026-11-21"
            title="Days on trail, 2026"
          />
        </div>
      </div>
    </section>
  );
}

/** Faint contour rings behind the section, the same map language as the hero. */
function ContourField() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.14]" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1200 800">
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse
          cx={930}
          cy={170}
          fill="none"
          key={i}
          rx={60 + i * 58}
          ry={40 + i * 44}
          stroke="#F5F1E8"
          strokeWidth={i % 5 === 4 ? 1.6 : 0.8}
          transform="rotate(-18 930 170)"
        />
      ))}
    </svg>
  );
}
