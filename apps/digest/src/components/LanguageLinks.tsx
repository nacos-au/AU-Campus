"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { isUnderReview, localeNames, type Locale } from "@/i18n/locales";

const SHOWN: Locale[] = ["en", "fr", "yo", "ig", "ha"];

/** Five text links shown above the masthead (desktop). */
export function LanguageLinks() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <ul
      aria-label="Language"
      className="flex items-center justify-center gap-x-4 text-[11px]"
    >
      {SHOWN.map((l) => (
        <li key={l}>
          <button
            type="button"
            disabled={pending}
            lang={l}
            onClick={() => startTransition(() => setLocale(l))}
            title={isUnderReview(l) ? "Translation under review" : undefined}
            className={`transition-colors hover:text-ink ${
              l === current
                ? "font-bold text-ink underline underline-offset-4"
                : isUnderReview(l)
                  ? "text-ink-soft/70"
                  : "text-ink-soft"
            }`}
          >
            {localeNames[l]}
          </button>
        </li>
      ))}
    </ul>
  );
}
