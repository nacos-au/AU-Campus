import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./locales";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

/** Missing keys fall back to English so a partly-translated locale never breaks. */
function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] =
      v && typeof v === "object" && b && typeof b === "object"
        ? merge(b as Messages, v as Messages)
        : v;
  }
  return out;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale && isLocale(cookieLocale)
    ? cookieLocale
    : defaultLocale;

  const messages =
    locale === "en"
      ? (en as Messages)
      : merge(
          en as Messages,
          (await import(`../../messages/${locale}.json`)).default as Messages
        );

  return { locale, messages };
});
