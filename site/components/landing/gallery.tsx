"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import {
  AnimatePresence,
  motion,
  type MotionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
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

/** Two decimals, so server and client print the same transform. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const wrap = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Where each slot sits round the ring, as an angle (0° = straight at you). */
const RING = SLOTS.map((s) => {
  const dx = s.cx - CENTRE.x;
  return { ...s, dx, at: (Math.atan2(dx, s.z) * 180) / Math.PI };
});
/**
 * Slots in the order they come to the front as the ring turns forwards. The
 * screens are dealt onto them in that order, and the ring starts offset so
 * the first screen is already in front at 0°.
 */
const ORDER = RING.map((r, i) => ({ i, front: (((-r.at % 360) + 360) % 360) })).sort((x, y) => x.front - y.front);
const BASE = ORDER[0].front;
/** The turn, 0 → 360°, at which each screen is square to you. */
const STOPS = ORDER.map((o) => o.front - BASE);
const CARDS = SCREENS.map((screen, k) => ({ screen, slot: RING[ORDER[k].i], stop: STOPS[k] }));

/**
 * Scroll progress → turn. Each screen gets an equal share of the scroll: it
 * holds square to you for the first part, then the ring eases on to the next.
 * After the last screen the ring comes round to the first again (360°) and
 * the page lets go.
 */
const HOLD = 0.42;
const SPAN = 0.96;
const KEYS: number[] = [];
const ANGLES: number[] = [];
STOPS.forEach((stop, k) => {
  const c = (k / STOPS.length) * SPAN;
  KEYS.push(c, c + (HOLD / STOPS.length) * SPAN);
  ANGLES.push(stop, stop);
});
KEYS.push(SPAN, 1);
ANGLES.push(360, 360);
const EASES = KEYS.slice(1).map((_, k) => (k % 2 === 0 ? (t: number) => t : easeInOut));

/** How far into focus a card is, 0–1, from how far it is from square to you. */
const FOCUS_WINDOW = 24;
function focusOf(stop: number, deg: number) {
  const off = Math.abs(wrap(deg - stop));
  return smooth(Math.max(0, 1 - off / FOCUS_WINDOW));
}

function frontCard(deg: number) {
  let best = 0;
  let bestOff = Infinity;
  CARDS.forEach((c, k) => {
    const off = Math.abs(wrap(deg - c.stop));
    if (off < bestOff) {
      bestOff = off;
      best = k;
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
      const w = width < 640 ? 820 : FOOTPRINT.w;
      setScale(Math.max(0.25, Math.min(width / w, height / FOOTPRINT.h, 1)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);
  return scale;
}

/**
 * A card in focus slides out along its spoke to the same distance from the
 * ring's centre (the ring is oval, so each needs a different push), then
 * grows a touch: every screen arrives at the same size.
 */
const FOCUS_RADIUS = 700;
const GROW = 0.12;
/** And how far it rises, so it sits clear of the caption. */
const LIFT_FOCUS = 275;

function Card({ card, spin }: { card: (typeof CARDS)[number]; spin: MotionValue<number> }) {
  const { slot, screen } = card;
  const push = FOCUS_RADIUS / Math.hypot(slot.dx, slot.z) - 1;
  const transform = useTransform(() => {
    const f = focusOf(card.stop, spin.get());
    // In focus the card turns to face you: its yaw swings from the Figma
    // tumble to the spoke's angle, and the tilt flips to cancel the ring's.
    const yaw = slot.at + (1 - f) * wrap(slot.turn - slot.at);
    const pitch = -12 * (1 - f) - TILT * f;
    const roll = -13 * (1 - f);
    return (
      `translate3d(${r2(slot.dx * push * f)}px, ${r2(-LIFT_FOCUS * f)}px, ${r2(slot.z * (1 + push * f))}px) ` +
      `rotateY(${r2(yaw)}deg) rotateX(${r2(pitch)}deg) rotateZ(${r2(roll)}deg) scale(${r2(1 + GROW * f)})`
    );
  });
  const opacity = useTransform(() => r2(0.55 + 0.45 * focusOf(card.stop, spin.get())));
  return (
    <motion.figure
      className="absolute m-0 [transform-style:preserve-3d]"
      style={{ left: r2(slot.cx - CARD_W / 2), top: r2(CENTRE.y - CARD_H / 2), width: CARD_W, transform, opacity }}
    >
      <Phone className="shadow-[0_30px_60px_-28px_rgba(28,33,30,0.5),inset_0_0_0_1.5px_rgba(255,255,255,0.12)]">
        <Shot alt={`Apex ${screen.title} screen: ${screen.note.toLowerCase()}`} priority src={screen.src} />
      </Phone>
    </motion.figure>
  );
}

function Ring({ spin }: { spin: MotionValue<number> }) {
  const transform = useTransform(() => `rotateX(${TILT}deg) rotateY(${r2(spin.get() + BASE)}deg)`);
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
        {CARDS.map((card) => (
          <Card card={card} key={card.screen.src} spin={spin} />
        ))}
      </motion.div>
    </div>
  );
}

/**
 * Pinned while you scroll: the screens ride a tilted 3D ring that turns once,
 * 0 → 360°, with the scroll, stopping on each screen in turn so it can square
 * up and come forward. When the turn is done the page lets go.
 */
export function Gallery() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const scale = useStageScale(stage);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const turn = useTransform(scrollYProgress, KEYS, ANGLES, { clamp: true, ease: EASES });
  // Under reduced motion the ring rests with the first screen square to you.
  const still = useMotionValue(0);
  // Directly on the scroll position. A spring lags the ring and keeps animating after the flick.
  const spin = reduce ? still : turn;
  const bar = useTransform(scrollYProgress, [0, SPAN], [0, 1], { clamp: true });
  const [front, setFront] = useState(0);
  useMotionValueEvent(turn, "change", (deg) => {
    const next = frontCard(deg);
    setFront((prev) => (prev === next ? prev : next));
  });

  const caption = CARDS[reduce ? 0 : front].screen;

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
          <Ring spin={spin} />
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
    <section className="relative bg-paper" id="screens" ref={ref} style={{ height: "640svh" }}>
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">{body}</div>
    </section>
  );
}
