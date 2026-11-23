"use client";

import { useState } from "react";
import type { CampusFact } from "@/lib/types";

type Props = {
  fact: CampusFact;
  kicker?: string;
  revealLabel?: string;
  hideLabel?: string;
};

export function FunFactCloud({
  fact,
  kicker = "Did you know?",
  revealLabel = "Reveal answer",
  hideLabel = "Hide answer",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label={kicker}
      className="relative mx-auto w-full max-w-2xl px-4 py-10 md:py-14"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[85%] w-[95%] max-w-xl rounded-[45%_55%_50%_50%/55%_45%_55%_45%] bg-ink/[0.03] blur-[1px]"
          aria-hidden
        />
      </div>

      <div className="relative mx-auto max-w-lg rounded-[40%_60%_55%_45%/50%_45%_55%_50%] border border-ink/15 bg-paper/90 px-8 py-10 text-center shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-[2px] md:px-12 md:py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
          {kicker}
        </p>
        <h2 className="mt-4 font-serif text-2xl font-bold leading-snug text-ink md:text-[1.75rem]">
          {fact.question}
        </h2>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-6 inline-flex items-center gap-2 border-b border-ink pb-0.5 text-[11px] font-bold uppercase tracking-wider text-ink transition-opacity hover:opacity-70"
        >
          {open ? hideLabel : revealLabel}
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <p className="mt-5 font-serif text-base leading-relaxed text-ink-soft md:text-lg">
              {fact.answer}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
