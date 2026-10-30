export const locales = [
  "en",
  "fr",
  "yo",
  "ig",
  "ha",
  "es",
  "ar",
  "pt",
] as const;

export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** High-confidence chrome — no “under review” label. */
export const verifiedLocales = ["en", "fr"] as const satisfies readonly Locale[];

/** Selectable but labeled until a native speaker signs off. */
export const underReviewLocales = [
  "yo",
  "ig",
  "ha",
  "es",
  "ar",
  "pt",
] as const satisfies readonly Locale[];

export const localLocales = ["yo", "ig", "ha"] as const satisfies readonly Locale[];

export const globalLocales = [
  "en",
  "fr",
  "es",
  "ar",
  "pt",
] as const satisfies readonly Locale[];

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  yo: "Yorùbá",
  ig: "Igbo",
  ha: "Hausa",
  es: "Español",
  ar: "العربية",
  pt: "Português",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function isUnderReview(locale: Locale): boolean {
  return (underReviewLocales as readonly string[]).includes(locale);
}

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}
