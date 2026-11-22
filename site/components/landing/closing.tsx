"use client";

import AttractButton from "@/components/kokonutui/attract-button";
import TopoBackground from "@/components/kokonutui/topo-background";

import { AppleMark, Peak } from "./icons";
import { Reveal, RiseWords } from "./reveal";

export function Closing() {
  return (
    <section className="relative" id="download">
      <TopoBackground
        className="min-h-[88svh] bg-ink text-[#d9925e]/60 [&>*]:text-paper"
        interval={28}
        seed={21}
        speed={0.25}
      >
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 py-32 text-center">
          <Peak className="mb-8 size-14 text-paper" />
          <h2 className="font-display font-extrabold text-[clamp(2.8rem,7vw,6.2rem)] text-paper leading-[0.92] tracking-[-0.045em]">
            <RiseWords text={"Your next summit\nis already waiting."} />
          </h2>
          <Reveal delay={0.3}>
            <p className="mx-auto mt-8 max-w-lg text-lg text-paper/70 leading-relaxed">
              Record it, fly over it, rank it. Apex for iPhone.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={0.4}>
            <AttractButton
              className="h-16 min-w-0 gap-3 rounded-full bg-paper px-9 font-semibold text-[17px] text-ink hover:bg-white"
              containerClassName="[&_canvas]:text-[#d9925e]"
              radius={96}
            >
              <AppleMark className="size-5" />
              Download now
            </AttractButton>
          </Reveal>
        </div>
      </TopoBackground>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-paper/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 border-white/10 border-t px-5 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <a className="flex items-center gap-2 font-display font-extrabold text-[20px] text-paper tracking-[-0.03em]" href="#top">
          <Peak className="size-6" /> Apex
        </a>
        <p>
          Mount Rainier photo by Walter Siegmund,{" "}
          <a className="underline underline-offset-2 hover:text-paper" href="https://commons.wikimedia.org/wiki/File:Mount_Rainier_5917.JPG">
            CC BY-SA 3.0
          </a>
          . Trail data © OpenStreetMap contributors.
        </p>
        <p>© 2026 Apex</p>
      </div>
    </footer>
  );
}
