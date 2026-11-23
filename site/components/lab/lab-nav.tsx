"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/lab/a", label: "A · Hike is the scroll" },
  { href: "/lab/b", label: "B · Velocity + type" },
  { href: "/lab/c", label: "C · Altitude" },
  { href: "/lab/effects", label: "Effects" },
] as const;

/** Lab-only links between the options. Not part of the real page. */
export function LabNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 gap-1 rounded-full bg-ink/90 p-1 text-[13px] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)] backdrop-blur">
      {LINKS.map((l) => (
        <Link
          className={`whitespace-nowrap rounded-full px-3.5 py-2 ${path === l.href ? "bg-paper text-ink" : "text-paper/75 hover:text-paper"}`}
          href={l.href}
          key={l.href}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
