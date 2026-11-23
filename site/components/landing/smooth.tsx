"use client";

import Lenis from "lenis";
import Snap from "lenis/snap";
import { useEffect } from "react";

let current: Lenis | null = null;

/** Scrolls to an element with Lenis when it is running, natively otherwise. */
export function scrollToTarget(el: HTMLElement) {
  if (current) current.scrollTo(el, { duration: 1.2 });
  else el.scrollIntoView({ behavior: "smooth" });
}

/**
 * Weighted, momentum scrolling with soft section snapping on laptops: stop
 * near the top of a section and the page settles onto it; stop anywhere else
 * and it stays put. Off under reduced motion.
 */
export function SmoothScroll({ lerp = 0.13 }: { lerp?: number }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp, wheelMultiplier: 1.15, smoothWheel: true });
    current = lenis;
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    let snap: Snap | null = null;
    if (window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches) {
      snap = new Snap(lenis, {
        type: "proximity",
        distanceThreshold: "12%",
        debounce: 450,
        duration: 0.7,
        easing: (t) => 1 - Math.pow(1 - t, 4),
      });
    }
    // Section tops as plain offsets, measured again whenever the page changes
    // height (fonts, the pinned hike swapping in, images loading).
    let removers: (() => void)[] = [];
    const measure = () => {
      const s = snap;
      if (!s) return;
      for (const remove of removers) remove();
      removers = [...document.querySelectorAll<HTMLElement>("[data-snap]")].map((el) => {
        let top = 0;
        for (let node: HTMLElement | null = el; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
        return s.add(top);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      snap?.destroy();
      lenis.destroy();
      current = null;
    };
  }, [lerp]);
  return null;
}
