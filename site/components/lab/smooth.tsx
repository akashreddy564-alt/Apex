"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/** Weighted, momentum scrolling for a lab page. Off under reduced motion. */
export function SmoothScroll({ lerp = 0.08 }: { lerp?: number }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp, wheelMultiplier: 0.9 });
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [lerp]);
  return null;
}
