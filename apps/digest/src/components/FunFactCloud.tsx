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
      className="mx-auto w-full max-w-2xl px-4 py-10 md:py-14"
    >
      {/* Soft cloud: grows with content; mobile uses a contained pill-blob so answers stay inside */}
      <div
        className={[
          "relative mx-auto overflow-hidden border border-ink/15 bg-paper",
          "px-6 py-8 text-center sm:px-10 sm:py-10 md:px-12 md:py-12",
          "rounded-[1.75rem] sm:rounded-[2.5rem]",
          "md:rounded-[40%_60%_55%_45%/50%_45%_55%_50%]",
          "shadow-[0_1px_0_rgba(0,0,0,0.04)]",
          "before:pointer-events-none before:absolute before:inset-2 before:-z-10",
          "before:rounded-[inherit] before:bg-ink/[0.03]",
        ].join(" ")}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">
          {kicker}
        </p>
        <h2 className="mt-3 break-words font-serif text-xl font-bold leading-snug text-ink sm:mt-4 sm:text-2xl md:text-[1.75rem]">
          {fact.question}
        </h2>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-5 inline-flex items-center gap-2 border-b border-ink pb-0.5 text-[11px] font-bold uppercase tracking-wider text-ink transition-opacity hover:opacity-70 sm:mt-6"
        >
          {open ? hideLabel : revealLabel}
        </button>

        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="mt-4 break-words font-serif text-[15px] leading-relaxed text-ink-soft sm:mt-5 sm:text-base md:text-lg">
              {fact.answer}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
