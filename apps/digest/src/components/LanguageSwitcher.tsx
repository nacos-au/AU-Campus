"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import {
  globalLocales,
  isUnderReview,
  localeNames,
  localLocales,
  type Locale,
} from "@/i18n/locales";

function optionLabel(code: Locale): string {
  const name = localeNames[code];
  return isUnderReview(code) ? `${name} · “under review”` : name;
}

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();
  const muted = isUnderReview(locale);

  return (
    <select
      aria-label="Language"
      value={locale}
      disabled={pending}
      onChange={(e) => startTransition(() => setLocale(e.target.value))}
      className={`border-0 bg-transparent text-[11px] font-semibold uppercase tracking-wider cursor-pointer focus:outline-none ${
        muted ? "text-ink-soft/70" : "text-ink-soft hover:text-ink"
      }`}
    >
      <optgroup label="Local">
        {localLocales.map((l) => (
          <option key={l} value={l} className="normal-case tracking-normal">
            {optionLabel(l)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Global">
        {globalLocales.map((l) => (
          <option key={l} value={l} className="normal-case tracking-normal">
            {optionLabel(l)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
