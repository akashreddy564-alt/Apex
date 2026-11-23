"use client";

import { WordsStagger } from "@/components/spell/words-stagger";
import { LayoutGroup, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import NotificationStack, { type StackNotification } from "@/components/kokonutui/notification-stack";

import { Peak } from "./icons";
import { EASE_OUT, H2 } from "./reveal";
import NumberFlow from "@number-flow/react";
import { sfx } from "./sound";

function Badge({ bg }: { bg: string }) {
  return (
    <span className="grid size-10 place-items-center rounded-[11px]" style={{ background: bg }}>
      <Peak className="size-6 text-paper" />
    </span>
  );
}

const NOTES: StackNotification[] = [
  {
    id: "passed",
    app: "Apex",
    title: "Sam passed you",
    body: "Cascade Crew board: Sam climbed 4,475 ft on Mailbox Peak this week.",
    time: "now",
    icon: <Badge bg="#94552A" />,
  },
  {
    id: "ranked",
    app: "Apex",
    title: "Priya ranked Lake Serene #1",
    body: "It beat Colchuck Lake and Mount Si. Leave a comment?",
    time: "12m",
    icon: <Badge bg="#2F7A4A" />,
  },
  {
    id: "pick",
    app: "Apex",
    title: "Your weekend pick",
    body: "Rattlesnake Ledge: 3.8 mi, 1,276 ft. Short enough for Saturday morning.",
    time: "1h",
    icon: <Badge bg="#2B6A99" />,
  },
  {
    id: "streak",
    app: "Apex",
    title: "6 weeks in a row",
    body: "One more hike by Sunday keeps your streak going.",
    time: "3h",
    icon: <Badge bg="#1C211E" />,
  },
];

export function Friends() {
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState(NOTES.length);

  return (
    <section className="relative overflow-hidden bg-raised/60 py-28 sm:py-40" id="friends">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <h2 className={`${H2} text-ink`}>
            <WordsStagger inView stagger={0.06} speed={0.6}>
              Start a group. Climb the board.
            </WordsStagger>
          </h2>
          <p className="mt-6 max-w-[34rem] text-[1.075rem] text-muted-ink leading-relaxed [text-wrap:pretty]">
            Share hikes with friends, see what they ranked, and race a weekly climbing board with
            your group. Apex taps you on the shoulder when someone passes you.
          </p>
          <Board />
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full max-w-md">
            <NotificationStack
              key={round}
              notifications={NOTES}
              onDismiss={() => {
                sfx("swipe");
                setLeft((n) => {
                  if (n <= 1) {
                    window.setTimeout(() => {
                      setRound((r) => r + 1);
                      setLeft(NOTES.length);
                    }, 700);
                  }
                  return n - 1;
                });
              }}
            />
          </div>
          <p className="mt-6 text-[13px] text-muted-ink">
            {left > 0 ? "Tap or hover to fan them out. Swipe one away." : "More on the way…"}
          </p>
        </div>
      </div>
    </section>
  );
}

type Climber = { name: string; ft: number; you?: boolean };
const BEFORE: Climber[] = [
  { name: "You", ft: 3350, you: true },
  { name: "Sam", ft: 2970 },
  { name: "Priya", ft: 2287 },
  { name: "Maya", ft: 1276 },
];
const SAM_AFTER = 4475;

/**
 * The group's weekly climbing board. It plays once: Sam logs Mailbox Peak,
 * his bar grows past yours and the rows swap, which is the notification
 * on the right happening for real.
 */
function Board() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-25% 0px" });
  const reduce = useReducedMotion();
  const [passed, setPassed] = useState(Boolean(reduce));

  useEffect(() => {
    if (!inView || reduce) return;
    const id = window.setTimeout(() => {
      sfx("notification");
      setPassed(true);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [inView, reduce]);

  const rows = BEFORE.map((c) => (c.name === "Sam" && passed ? { ...c, ft: SAM_AFTER } : c)).sort((a, b) => b.ft - a.ft);
  const max = SAM_AFTER;

  return (
    <div className="mt-10 max-w-md rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(28,33,30,0.07),0_24px_50px_-30px_rgba(28,33,30,0.4)]" ref={ref}>
      <div className="mb-4 flex items-baseline justify-between">
        <p className="font-display font-bold text-ink text-lg">Cascade Crew</p>
        <p className="text-[13px] text-muted-ink">Feet climbed this week</p>
      </div>
      <LayoutGroup>
        <ol className="space-y-2.5">
          {rows.map((c, i) => (
            <motion.li
              className="grid grid-cols-[1.5rem_4rem_1fr_4.5rem] items-center gap-3 text-[14px]"
              key={c.name}
              layout
              transition={{ type: "spring", duration: 0.6, bounce: 0.12 }}
            >
              <span className={`font-display font-extrabold tabular-nums ${i === 0 ? "text-streak" : "text-ink"}`}>{i + 1}</span>
              <span className={c.you ? "font-semibold text-ink" : "text-ink-2"}>{c.name}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-raised">
                <motion.span
                  animate={{ scaleX: inView || reduce ? c.ft / max : 0 }}
                  className={`block h-full origin-left rounded-full ${c.you ? "bg-climb" : "bg-climb/45"}`}
                  initial={false}
                  transition={{ duration: reduce ? 0 : 0.9, delay: passed ? 0 : 0.08 * i, ease: EASE_OUT }}
                />
              </span>
              <span className="text-right text-climb tabular-nums">
                <NumberFlow value={c.ft} />
              </span>
            </motion.li>
          ))}
        </ol>
      </LayoutGroup>
    </div>
  );
}
