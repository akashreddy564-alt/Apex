"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

import { sfx } from "./sound";

const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Past this share of the track, letting go starts the hike. */
const COMMIT = 0.72;
/** Seconds for the recording screen's trail to reach the ridge. */
const CLIMB_SECONDS = 6;
/** Where the screenshot's slider sits on the 390×844 screen, in percent. */
const BAR = { left: 4.6, right: 4.4, top: 90.8, height: 7.2 };
/** The knob's centre, where the recording screen bursts open from. */
const ORIGIN = "12% 94.4%";

/** A stylised Angels Landing: switchbacks up to the ridge. */
const TRAIL_D =
  "M70 330 C 92 318, 98 300, 84 288 S 66 262, 92 252 S 126 240, 104 226 S 80 206, 110 196 S 150 186, 128 170 S 104 150, 136 140 S 176 128, 158 112 S 140 92, 170 80 S 196 66, 188 48";

export type HikeState = "idle" | "starting" | "recording";

/**
 * The hero phone's "Slide to start this hike", made real. Drag the knob to the
 * end (or press it and use Enter) and the screen bursts into a recording.
 */
export function SlideToStart({ onState }: { onState?: (state: HikeState) => void }) {
  const reduce = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(0);
  const [state, setState] = useState<HikeState>("idle");
  const [touched, setTouched] = useState(false);
  const x = useMotionValue(0);
  const share = useTransform(x, (v) => (max > 0 ? v / max : 0));
  const fill = useTransform(x, (v) => v + (track.current?.offsetHeight ?? 0));
  const labelOpacity = useTransform(share, [0, 0.55], [1, 0]);
  const arrowRotate = useTransform(share, [COMMIT, 1], [0, -90]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => setMax(Math.max(0, el.offsetWidth - el.offsetHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => onState?.(state), [state, onState]);

  // Until someone tries it, the knob buzzes like a phone (a quick, tight
  // shake), then leans right to show which way to slide. Soon after load,
  // then every few seconds.
  const buzz = useMotionValue(0);
  useEffect(() => {
    if (touched || reduce || state !== "idle" || max === 0) return;
    const hint = () => {
      void animate(buzz, [0, -6, 6, -5, 5, -3, 3, 0], { duration: 0.4, ease: "linear" });
      void animate(x, [0, 3, -3, 3, -3, 2, -2, 0, 20, 0], {
        duration: 1.15,
        times: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.6, 1],
        ease: "easeOut",
      });
    };
    const first = window.setTimeout(hint, 1800);
    const id = window.setInterval(hint, 3600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [touched, reduce, state, max, x, buzz]);

  const start = () => {
    if (state !== "idle") return;
    setTouched(true);
    sfx("recording");
    setState("starting");
    void animate(x, max, { type: "spring", stiffness: 500, damping: 40 });
    window.setTimeout(() => setState("recording"), reduce ? 0 : 260);
  };

  const finish = () => {
    sfx("stop");
    setState("idle");
    void animate(x, 0, { type: "spring", stiffness: 300, damping: 32, delay: 0.35 });
  };

  return (
    <>
      <div
        className="absolute"
        style={{ left: `${BAR.left}%`, right: `${BAR.right}%`, top: `${BAR.top}%`, height: `${BAR.height}%` }}
      >
        <div className="relative size-full overflow-hidden rounded-full bg-[#ECE5D6] shadow-[inset_0_0_0_1px_rgba(28,33,30,0.08)]" ref={track}>
          {/* The trail behind the knob fills in climb brown as you drag. */}
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#c99a6b,#94552A)]" style={{ width: fill }} />
          <motion.span
            aria-hidden
            className="slide-shimmer absolute inset-0 grid place-items-center pl-[18%] font-medium text-[clamp(11px,3.6cqw,15px)] text-ink/70"
            style={{ opacity: labelOpacity }}
          >
            Slide to start this hike
          </motion.span>
          <motion.button
            aria-label="Slide to start this hike"
            className="absolute inset-y-0 left-0 z-10 grid aspect-square h-full cursor-grab touch-pan-y place-items-center rounded-full bg-ink text-paper shadow-[0_8px_18px_-6px_rgba(28,33,30,0.6)] active:cursor-grabbing"
            drag={state === "idle" ? "x" : false}
            dragConstraints={{ left: 0, right: max }}
            dragElastic={0.04}
            dragMomentum={false}
            onDragEnd={() => {
              if (share.get() >= COMMIT) start();
              else void animate(x, 0, { type: "spring", stiffness: 420, damping: 30 });
            }}
            onDragStart={() => {
              setTouched(true);
              sfx("drag-start");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                start();
              }
            }}
            style={{ x, rotate: buzz }}
            type="button"
            whileTap={{ scale: 0.94 }}
          >
            <motion.svg className="size-[42%]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" style={{ rotate: arrowRotate }} viewBox="0 0 24 24">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </motion.svg>
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {state === "recording" ? <Recording key="rec" onFinish={finish} reduce={Boolean(reduce)} /> : null}
      </AnimatePresence>
    </>
  );
}

/** The recording screen: bursts open from the knob, counts the hike up, folds back on Finish. */
function Recording({ onFinish, reduce }: { onFinish: () => void; reduce: boolean }) {
  const elapsed = useMotionValue(0);
  const [real, setReal] = useState(0);
  useAnimationFrame((_, delta) => {
    elapsed.set(elapsed.get() + Math.min(delta, 64) / 1000);
    const next = Math.round(elapsed.get() * 20) / 20;
    if (next !== real) setReal(next);
  });
  // The climb to the ridge plays out in a few seconds, easing in to the top;
  // after that the clock keeps ticking at an easy pace.
  const walked = 1 - Math.pow(1 - Math.min(1, real / CLIMB_SECONDS), 3);
  const shown = Math.floor(walked * 5400 + Math.max(0, real - CLIMB_SECONDS) * 12);
  const h = Math.floor(shown / 3600);
  const m = Math.floor((shown % 3600) / 60);
  const s = shown % 60;
  const miles = (walked * 2.8).toFixed(2);
  const feet = Math.round(walked * 1488).toLocaleString("en-US");

  return (
    <motion.div
      animate={{ clipPath: `circle(150% at ${ORIGIN})` }}
      aria-label="Recording Angels Landing"
      className="absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#141816] text-paper"
      exit={{ clipPath: `circle(0% at ${ORIGIN})`, transition: { duration: reduce ? 0 : 0.6, ease: EASE_IN_OUT } }}
      initial={{ clipPath: `circle(0% at ${ORIGIN})` }}
      role="dialog"
      transition={{ duration: reduce ? 0 : 0.75, ease: EASE_IN_OUT }}
    >
      {/* Contour rings ripple out from where the knob landed. */}
      {!reduce &&
        [0, 1, 2, 3].map((i) => (
          <motion.span
            animate={{ scale: [0.2, 3.2], opacity: [0.55, 0] }}
            className="pointer-events-none absolute size-[60%] rounded-full border border-[#d9925e]"
            key={i}
            style={{ left: "-18%", top: "64%" }}
            transition={{ duration: 2.4, delay: 0.25 + i * 0.35, ease: "easeOut", repeat: Infinity, repeatDelay: 0.6 }}
          />
        ))}

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center gap-2 px-[7%] pt-[17%] text-[clamp(10px,3.2cqw,13px)]"
        initial={{ opacity: 0, y: -8 }}
        transition={{ delay: 0.45, duration: 0.4, ease: EASE_OUT }}
      >
        <span className="relative grid size-2.5 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#e5484d]/70" />
          <span className="size-2.5 rounded-full bg-[#e5484d]" />
        </span>
        <span className="font-medium tracking-[0.12em] text-paper/80">REC</span>
        <span className="text-paper/50">· Angels Landing</span>
      </motion.div>

      <motion.p
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        className="relative z-10 px-[7%] pt-[3%] font-display font-extrabold text-[clamp(2.2rem,15cqw,3.6rem)] leading-none tracking-[-0.04em] tabular-nums"
        initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE_OUT }}
      >
        {h}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </motion.p>

      {/* The trail draws itself up the ridge, with a GPS ping at its head. */}
      <div className="relative z-10 mx-[7%] mt-[4%] flex-1">
        <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" viewBox="40 30 180 320">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse cx="160" cy="70" fill="none" key={i} rx={30 + i * 28} ry={18 + i * 22} stroke="#d9925e" strokeOpacity={i % 3 === 2 ? 0.25 : 0.1} />
          ))}
          <path d={TRAIL_D} fill="none" stroke="rgba(245,241,232,0.14)" strokeLinecap="round" strokeWidth="5" />
          <motion.path
            animate={{ pathLength: Math.max(0.02, walked) }}
            d={TRAIL_D}
            fill="none"
            initial={{ pathLength: 0 }}
            stroke="#d9925e"
            strokeLinecap="round"
            strokeWidth="5"
            transition={{ duration: 0.12, ease: "linear" }}
          />
          <circle cx="70" cy="330" fill="#F5F1E8" r="5" />
        </svg>
        <PingAtHead progress={walked} />
      </div>

      <motion.dl
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 grid grid-cols-2 gap-3 px-[7%] pt-[3%] text-[clamp(10px,3cqw,12px)]"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6, duration: 0.45, ease: EASE_OUT }}
      >
        <div>
          <dt className="text-paper/50">Distance</dt>
          <dd className="font-display font-bold text-[#7fb2d9] text-[clamp(1rem,6.5cqw,1.6rem)] tabular-nums">{miles} mi</dd>
        </div>
        <div>
          <dt className="text-paper/50">Climbed</dt>
          <dd className="font-display font-bold text-[#d9925e] text-[clamp(1rem,6.5cqw,1.6rem)] tabular-nums">{feet} ft</dd>
        </div>
      </motion.dl>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex gap-2 px-[7%] pt-[5%] pb-[9%]"
        initial={{ opacity: 0, y: 14 }}
        transition={{ delay: 0.7, duration: 0.45, ease: EASE_OUT }}
      >
        <button
          className="press h-11 flex-1 rounded-full bg-paper font-semibold text-[13px] text-ink"
          onClick={onFinish}
          type="button"
        >
          Finish hike
        </button>
      </motion.div>
    </motion.div>
  );
}

/** A pulsing location dot riding the trail's head. Measured from the path, so it stays on the line. */
function PingAtHead({ progress }: { progress: number }) {
  const ref = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: 70, y: 330 });
  useEffect(() => {
    const path = ref.current;
    if (!path) return;
    const p = path.getPointAtLength(path.getTotalLength() * Math.max(0.02, progress));
    setPt({ x: p.x, y: p.y });
  }, [progress]);
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 size-full" preserveAspectRatio="xMidYMid meet" viewBox="40 30 180 320">
      <path d={TRAIL_D} fill="none" ref={ref} stroke="none" />
      <circle cx={pt.x} cy={pt.y} fill="#2B6A99" opacity="0.35" r="10">
        <animate attributeName="r" dur="1.4s" repeatCount="indefinite" values="6;16;6" />
        <animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="0.45;0;0.45" />
      </circle>
      <circle cx={pt.x} cy={pt.y} fill="#2B6A99" r="5.5" stroke="#F5F1E8" strokeWidth="2.5" />
    </svg>
  );
}

/** Rings that burst out from the phone the moment a hike starts. Sits behind the phone. */
export function StartBurst({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <AnimatePresence>
      {active ? (
        <motion.div className="pointer-events-none absolute inset-0" exit={{ opacity: 0 }} key="burst">
          {/* A warm flash behind the phone. */}
          <motion.span
            animate={{ opacity: [0, 0.9, 0], scale: [0.7, 1.35, 1.6] }}
            className="absolute inset-[-25%] rounded-full bg-[radial-gradient(closest-side,rgba(217,146,94,0.55),rgba(148,85,42,0.18)_55%,transparent)] blur-2xl"
            transition={{ duration: 1.4, ease: EASE_OUT }}
          />
          {/* Contour rings in the phone's shape, rippling out. */}
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              animate={{ scale: 1.55 + i * 0.22, opacity: 0 }}
              className="absolute inset-[-3%] rounded-[3.4rem] border-climb"
              initial={{ scale: 0.96, opacity: 0.8 }}
              key={i}
              style={{ borderWidth: 3 - Math.min(i, 2) }}
              transition={{ duration: 1.5, delay: i * 0.13, ease: EASE_OUT }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
