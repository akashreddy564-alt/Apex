"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";

import { Phone, Shot } from "./phone";

const SCREENS = [
  { src: "/screens/light-01-opening.png", title: "Opening", note: "A famous summit every time you open it" },
  { src: "/screens/light-02-home.png", title: "Home", note: "Your week, your streak, your weekend pick" },
  { src: "/screens/light-13-recording.png", title: "Recording", note: "Live route, distance and climb" },
  { src: "/screens/light-07-trail-page.png", title: "Trail", note: "Difficulty, profile and your history" },
  { src: "/screens/light-04-rankings.png", title: "Rankings", note: "Every trail you've done, in order" },
  { src: "/screens/dark-12-flyover-end.png", title: "Flyover", note: "Your hike in 3D, ready to share" },
  { src: "/screens/light-09-goal.png", title: "Goal", note: "A weekly target in miles or feet" },
  { src: "/screens/light-03-log.png", title: "Log", note: "Every hike, every foot" },
];

/*
 * The ring, from the Figma "floating gallery": a 1024×768 canvas holding a
 * 1383×1432 scene, eight slots around a slightly oval ring, each card turned
 * 45° further than the last and tipped a little so the ring tumbles as it spins.
 * The Figma cards were 308×423 polaroids; ours are phones at the app's
 * 390×844 screen ratio, so each slot keeps its centre and the card grows taller.
 */
const CANVAS = { w: 1024, h: 768 };
const SCENE = { w: 1382.969, h: 1432.024 };
const CARD_W = 236;
/** Phone frame: 9px bezel round a 390×844 screen. */
const CARD_H = 18 + ((CARD_W - 18) * 844) / 390;
/** Figma slot centres (left + half the polaroid width), depths and turns. */
const SLOTS = [
  { cx: 786.15, z: 554.101, turn: 81 },
  { cx: 1070.95, z: 308.527, turn: 126 },
  { cx: 1133.93, z: -117.778, turn: 171 },
  { cx: 938.19, z: -475.09, turn: 216 },
  { cx: 598.39, z: -554.101, turn: 261 },
  { cx: 313.58, z: -308.527, turn: 306 },
  { cx: 249.82, z: 117.778, turn: 351 },
  { cx: 446.35, z: 475.09, turn: 396 },
];
const CENTRE = { x: SCENE.w / 2, y: 504.32 + 422.798 / 2 };
const TILT = -27;
/** Under reduced motion the ring rests here, a front card turned towards you. */
const REST_ANGLE = -18;

/** Which slot is nearest the viewer once the ring has turned by `deg`. */
function frontSlot(deg: number) {
  const a = (deg * Math.PI) / 180;
  let best = 0;
  let bestZ = -Infinity;
  SLOTS.forEach((s, i) => {
    const x = s.cx - CENTRE.x;
    const z = -x * Math.sin(a) + s.z * Math.cos(a);
    if (z > bestZ) {
      bestZ = z;
      best = i;
    }
  });
  return best;
}

/**
 * The ring's footprint as it turns, measured in canvas units: the tilt and
 * perspective push the front cards past the 1024×768 Figma canvas and below
 * its centre, so we fit this box rather than the canvas, and lift the ring by
 * LIFT to centre it.
 */
const FOOTPRINT = { w: 1560, h: 1120 };
const LIFT = 150;

/**
 * Fits the ring to the stage. Done in JS: the Figma `calc(100vw / 1024px)`
 * (a length divided by a length) isn't valid CSS in Safari. Phones fit a
 * narrower box so the screens aren't postage stamps; the side cards run off
 * the edge as they swing round.
 */
function useStageScale(stage: RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = width < 640 ? 1000 : FOOTPRINT.w;
      setScale(Math.max(0.25, Math.min(width / w, height / FOOTPRINT.h, 1)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);
  return scale;
}

function Ring({ spin }: { spin: MotionValue<number> | number }) {
  const transform = useTransform(() => {
    const deg = typeof spin === "number" ? spin : spin.get();
    return `rotateX(${TILT}deg) rotateY(${deg}deg)`;
  });
  return (
    <div
      className="absolute top-1/2 left-1/2"
      style={{
        width: SCENE.w,
        height: SCENE.h,
        transform: `translate(-50%, calc(-50% - ${LIFT}px))`,
        perspective: 1800,
        perspectiveOrigin: "50% 50%",
      }}
    >
      <motion.div className="absolute inset-0 will-change-transform [transform-style:preserve-3d]" style={{ transform }}>
        {SCREENS.map((s, i) => {
          const slot = SLOTS[i];
          return (
            <figure
              className="absolute m-0 [transform-style:preserve-3d]"
              key={s.src}
              style={{
                left: slot.cx - CARD_W / 2,
                top: CENTRE.y - CARD_H / 2,
                width: CARD_W,
                transform: `translateZ(${slot.z}px) rotateX(-12deg) rotateY(${slot.turn}deg) rotateZ(-13deg)`,
              }}
            >
              <Phone className="shadow-[0_30px_60px_-28px_rgba(28,33,30,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.12)]">
                <Shot alt={`Apex ${s.title} screen: ${s.note.toLowerCase()}`} priority src={s.src} />
              </Phone>
            </figure>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Pinned while you scroll: the screens ride a tilted 3D ring that turns once,
 * 0 → 360°, with the scroll. When the turn is done the page lets go.
 */
export function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const scale = useStageScale(stage);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // A short hold at each end so the ring settles before it starts and after it's round.
  const turn = useTransform(scrollYProgress, [0.04, 0.96], [0, 360], { clamp: true });
  const spin = useSpring(turn, { stiffness: 120, damping: 30, mass: 0.4 });
  const bar = useTransform(scrollYProgress, [0.04, 0.96], [0, 1], { clamp: true });
  const [front, setFront] = useState(() => frontSlot(0));
  useMotionValueEvent(spin, "change", (deg) => setFront(frontSlot(deg)));

  const caption = SCREENS[reduce ? frontSlot(REST_ANGLE) : front];

  const body = (
    <>
      <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-6 px-5 pt-24 sm:px-8 sm:pt-28">
        <h2 className="font-display font-extrabold text-[clamp(2rem,4vw,3.4rem)] text-ink leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
          <WordsStagger inView stagger={0.06} speed={0.6}>
            Every screen, made for the trail.
          </WordsStagger>
        </h2>
        {!reduce && (
          <div aria-hidden className="mb-3 hidden h-1 w-40 shrink-0 overflow-hidden rounded-full bg-raised sm:block">
            <motion.div className="h-full origin-left bg-climb" style={{ scaleX: bar }} />
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1" ref={stage}>
        <div
          className="absolute top-1/2 left-1/2"
          style={{ width: CANVAS.w, height: CANVAS.h, transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          <Ring spin={reduce ? REST_ANGLE : spin} />
        </div>
      </div>
      <div className="relative mx-auto mb-10 h-14 w-full max-w-7xl px-5 text-center sm:mb-12 sm:px-8">
        <AnimatePresence initial={false}>
          <motion.p
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            className="absolute inset-x-0"
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            key={caption.src}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className="block font-bold font-display text-ink text-lg tracking-[-0.02em]">{caption.title}</span>
            <span className="block text-muted-ink text-sm">{caption.note}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </>
  );

  if (reduce) {
    return (
      <section className="relative flex h-[100svh] min-h-[640px] flex-col overflow-hidden bg-paper" id="screens" ref={ref}>
        {body}
      </section>
    );
  }

  return (
    <section className="relative bg-paper" id="screens" ref={ref} style={{ height: "360svh" }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">{body}</div>
    </section>
  );
}
