import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import type { Edition, Purchase } from "@/lib/types";

export const metadata: Metadata = { title: "Account" };

type PurchaseWithEdition = Purchase & { editions: Edition | null };

export default async function AccountPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/account");

  const supabase = await createClient();
  const [t, locale, { data }] = await Promise.all([
    getTranslations("account"),
    getLocale(),
    supabase
      .from("purchases")
      .select("*, editions(*)")
      .order("paid_at", { ascending: false }),
  ]);

  const purchases = (data ?? []) as unknown as PurchaseWithEdition[];
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {profile?.display_name} · {user.email} ·{" "}
          <span className="uppercase tracking-wide">{profile?.role}</span>
        </p>
      </header>

      <section className="pt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          {t("library")}
        </h2>

        {purchases.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">{t("libraryEmpty")}</p>
        ) : (
          <div className="mt-4 divide-y divide-rule">
            {purchases.map((p) => (
              <div key={p.id} className="flex items-center gap-4 py-4">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden border border-rule-dark bg-rule">
                  {p.editions?.cover_url && (
                    <Image
                      src={p.editions.cover_url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif font-bold">
                    {p.editions?.title ?? "Edition"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {t("purchasedOn", {
                      date: dateFmt.format(new Date(p.paid_at)),
                    })}{" "}
                    · Ref {p.reference}
                  </p>
                </div>
                <Link
                  href={`/read/${p.edition_id}`}
                  className="shrink-0 bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent transition-colors"
                >
                  Read
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
