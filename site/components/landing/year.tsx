"use client";

import ActivityTerrain from "@/components/kokonutui/activity-terrain";

import { Eyebrow, Reveal, RiseWords } from "./reveal";

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
    <section className="relative py-28 sm:py-40" id="year">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <Eyebrow tone="text-streak">05 · Goals and streaks</Eyebrow>
            <h2 className="font-display font-extrabold text-[clamp(2.4rem,5.2vw,4.6rem)] text-ink leading-[0.95] tracking-[-0.04em]">
              <RiseWords text={"A year you can\nturn in your hand."} />
            </h2>
          </div>
          <Reveal delay={0.2}>
            <p className="max-w-lg text-lg text-muted-ink leading-relaxed lg:mb-2">
              Set a weekly goal in miles or feet and keep the streak green. Every hike raises the
              ground: {total} days out this year, drawn as terrain. Drag it to turn.
            </p>
          </Reveal>
        </div>
        <Reveal className="mt-14 flex justify-center" delay={0.15}>
          <ActivityTerrain
            className="max-w-4xl border-line bg-white shadow-[0_40px_80px_-50px_rgba(28,33,30,0.4)] [--terrain-0:#EAE3D4] [--terrain-1:#BFD3AE] [--terrain-2:#7FB08F] [--terrain-3:#2F7A4A] [--terrain-4:#1B4D2E] [--terrain-accent:#94552A] [--terrain-text:#8A877D]"
            data={data}
            endDate="2026-11-21"
            title="Days on trail, 2026"
          />
        </Reveal>
      </div>
    </section>
  );
}
