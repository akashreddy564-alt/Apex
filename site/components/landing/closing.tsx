"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import AttractButton from "@/components/kokonutui/attract-button";
import TopoBackground from "@/components/kokonutui/topo-background";

import { AppleMark, Peak } from "./icons";
import { AssembleLetters } from "./reveal";
import { sfx } from "./sound";

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
          <h2 className="font-display font-extrabold text-[clamp(2.8rem,7vw,6rem)] text-paper leading-[0.94] tracking-[-0.035em] [text-wrap:balance]">
            <AssembleLetters text="Your next summit is already waiting." />
          </h2>
          <div>
            <p className="mx-auto mt-8 max-w-lg text-lg text-paper/75 leading-relaxed">
              Record it, fly over it, rank it. Apex for iPhone.
            </p>
          </div>
          <div className="mt-12">
            <AttractButton
              className="press h-16 min-w-0 gap-3 rounded-full bg-paper px-9 font-semibold text-[17px] text-ink hover:bg-white"
              containerClassName="[&_canvas]:text-[#d9925e]"
              onClick={() => sfx("press")}
              radius={96}
            >
              <AppleMark className="size-5" />
              Download now
            </AttractButton>
          </div>
        </div>
      </TopoBackground>
    </section>
  );
}

export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  // The wordmark rises out of the bottom edge as the page runs out.
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["45%", "0%"]);
  return (
    <footer className="overflow-hidden bg-ink text-paper/60" ref={ref}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 border-white/10 border-t px-5 py-10 text-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <a className="flex h-11 items-center gap-2 font-display font-extrabold text-[20px] text-paper tracking-[-0.03em]" href="#top">
          <Peak className="size-6" /> Apex
        </a>
        <p>
          Mount Rainier photo by Walter Siegmund,{" "}
          <a className="link-draw text-paper/80 hover:text-paper" href="https://commons.wikimedia.org/wiki/File:Mount_Rainier_5917.JPG">
            CC BY-SA 3.0
          </a>
          . Trail data © OpenStreetMap contributors. Sounds: UI SFX (CC0).
        </p>
        <nav aria-label="Legal" className="flex gap-5">
          <a className="link-draw text-paper/80 hover:text-paper" href="/privacy">Privacy</a>
          <a className="link-draw text-paper/80 hover:text-paper" href="/terms">Terms</a>
          <a className="link-draw text-paper/80 hover:text-paper" href="/support">Support</a>
          <span>© 2026 Apex</span>
        </nav>
      </div>
      <motion.p
        aria-hidden
        className="select-none text-center font-display font-extrabold text-[31vw] leading-[0.74] tracking-[-0.045em] text-[#d9925e]/[0.13]"
        style={{ y }}
      >
        APEX
      </motion.p>
    </footer>
  );
}
