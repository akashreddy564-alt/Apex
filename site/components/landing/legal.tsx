import Link from "next/link";
import type { ReactNode } from "react";

import { UPDATED } from "@/lib/contact";

import { Peak } from "./icons";

/** A plain reading page for the privacy policy, terms and support. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link className="flex h-11 items-center gap-2 font-display font-extrabold text-[20px] tracking-[-0.03em]" href="/">
          <Peak className="size-6" /> Apex
        </Link>
        <nav aria-label="Legal" className="flex gap-5 text-[14px] text-muted-ink">
          <Link className="link-draw hover:text-ink" href="/privacy">Privacy</Link>
          <Link className="link-draw hover:text-ink" href="/terms">Terms</Link>
          <Link className="link-draw hover:text-ink" href="/support">Support</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8" id="main">
        <h1 className="font-display font-extrabold text-[clamp(2.2rem,6vw,3.6rem)] leading-[1] tracking-[-0.035em]">{title}</h1>
        <p className="mt-5 max-w-[60ch] text-[1.075rem] text-muted-ink leading-relaxed [text-wrap:pretty]">{intro}</p>
        <p className="mt-3 text-[13px] text-muted-ink">Last updated {UPDATED}</p>
        <div className="legal mt-12">{children}</div>
      </main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="font-display font-bold text-[1.45rem] tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-[1.02rem] text-ink/85 leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  );
}
