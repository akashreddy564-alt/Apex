"use client";

import { useState } from "react";

import NotificationStack, { type StackNotification } from "@/components/kokonutui/notification-stack";

import { Peak } from "./icons";
import { Eyebrow, Reveal, RiseWords } from "./reveal";

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
          <Eyebrow tone="text-distance">06 · Friends</Eyebrow>
          <h2 className="font-display font-extrabold text-[clamp(2.4rem,5.2vw,4.6rem)] text-ink leading-[0.95] tracking-[-0.04em]">
            <RiseWords text={"Start a group.\nClimb the board."} />
          </h2>
          <Reveal delay={0.2}>
            <p className="mt-7 max-w-md text-lg text-muted-ink leading-relaxed">
              Share hikes with friends, see what they ranked, and race a weekly climbing board with
              your group. Apex taps you on the shoulder when someone passes you.
            </p>
          </Reveal>
        </div>
        <Reveal className="flex flex-col items-center" delay={0.1}>
          <div className="w-full max-w-md">
            <NotificationStack
              key={round}
              notifications={NOTES}
              onDismiss={() =>
                setLeft((n) => {
                  if (n <= 1) {
                    window.setTimeout(() => {
                      setRound((r) => r + 1);
                      setLeft(NOTES.length);
                    }, 700);
                  }
                  return n - 1;
                })
              }
            />
          </div>
          <p className="mt-6 text-[13px] text-faint">
            {left > 0 ? "Hover to fan them out. Swipe one away." : "More on the way…"}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
