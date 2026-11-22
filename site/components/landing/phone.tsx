import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** An iPhone-shaped frame at the app's 390×844 screen ratio. */
export function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-[2.9rem] bg-ink p-[9px] shadow-[0_50px_100px_-30px_rgba(28,33,30,0.55),0_30px_60px_-40px_rgba(148,85,42,0.45),inset_0_0_0_1.5px_rgba(255,255,255,0.12)]",
        className
      )}
    >
      <div className="relative aspect-[390/844] overflow-hidden rounded-[2.35rem] bg-paper">
        {children}
        <div className="pointer-events-none absolute top-[10px] left-1/2 h-[22px] w-[30%] -translate-x-1/2 rounded-full bg-ink" />
      </div>
    </div>
  );
}

export function Shot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      className="absolute inset-0 size-full object-cover object-top"
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      loading={priority ? "eager" : "lazy"}
      src={src}
    />
  );
}
