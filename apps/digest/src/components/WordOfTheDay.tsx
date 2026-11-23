"use client";

import { useState } from "react";
import type { CampusWord } from "@/lib/types";

type Props = {
  word: CampusWord;
  label?: string;
  revealLabel?: string;
  compact?: boolean;
};

export function WordOfTheDay({
  word,
  label = "Word of the Day",
  revealLabel = "Tap for meaning",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      id="word"
      className={`border border-ink/20 bg-paper ${compact ? "p-3" : "p-4 md:p-5"}`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 w-full text-left"
      >
        <p
          className={`font-serif font-bold text-ink ${
            compact ? "text-xl" : "text-2xl md:text-3xl"
          }`}
        >
          {word.word}
        </p>
        {!open && (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            {revealLabel}
          </p>
        )}
      </button>
      {open && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="font-serif text-sm leading-relaxed text-ink-soft md:text-base">
            {word.definition}
          </p>
          {word.example ? (
            <p className="mt-2 font-serif text-sm italic leading-snug text-ink/70">
              “{word.example}”
            </p>
          ) : null}
        </div>
      )}
    </aside>
  );
}
