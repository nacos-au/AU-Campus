"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { localeNames, locales } from "@/i18n/locales";

export function LanguageSwitcher() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Language"
      value={locale}
      disabled={pending}
      onChange={(e) => startTransition(() => setLocale(e.target.value))}
      className="border-0 bg-transparent text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink cursor-pointer focus:outline-none"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
