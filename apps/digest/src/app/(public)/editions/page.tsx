import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/site";
import type { Edition, Purchase } from "@/lib/types";
import { buyEdition } from "./actions";

export const metadata: Metadata = { title: "Print Editions" };

export default async function EditionsPage() {
  const supabase = await createClient();
  const [t, locale] = await Promise.all([
    getTranslations("editions"),
    getLocale(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: editionsData }, { data: purchasesData }] = await Promise.all([
    supabase
      .from("editions")
      .select("*")
      .eq("published", true)
      .order("issue_date", { ascending: false }),
    user
      ? supabase.from("purchases").select("*")
      : Promise.resolve({ data: [] }),
  ]);

  const editions = (editionsData ?? []) as Edition[];
  const owned = new Set(
    ((purchasesData ?? []) as Purchase[]).map((p) => p.edition_id)
  );

  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 gap-x-8 gap-y-12 pt-10 sm:grid-cols-2 lg:grid-cols-3">
        {editions.map((edition) => (
          <article key={edition.id} className="flex flex-col">
            <div className="relative aspect-[8/11] w-full overflow-hidden border border-rule-dark bg-rule">
              {edition.cover_url && (
                <Image
                  src={edition.cover_url}
                  alt={edition.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              )}
            </div>

            <h2 className="mt-4 font-serif text-xl font-bold leading-snug">
              {edition.title}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
              {dateFmt.format(new Date(edition.issue_date))}
            </p>
            {edition.description && (
              <p className="mt-2 text-sm leading-normal text-ink-soft">
                {edition.description}
              </p>
            )}

            <div className="mt-4 pt-1">
              {owned.has(edition.id) ? (
                <Link
                  href={`/read/${edition.id}`}
                  className="inline-block w-full bg-ink py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent transition-colors"
                >
                  {t("read")} — {t("owned")}
                </Link>
              ) : user ? (
                <form action={buyEdition.bind(null, edition.id)}>
                  <button className="w-full bg-accent py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors">
                    {t("buy", { price: formatNaira(edition.price_kobo) })}
                  </button>
                </form>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent("/editions")}`}
                  className="inline-block w-full border border-ink py-2.5 text-center text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors"
                >
                  {t("signInToBuy")} · {formatNaira(edition.price_kobo)}
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
