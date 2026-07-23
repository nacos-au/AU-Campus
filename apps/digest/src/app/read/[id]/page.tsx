import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { verifyTransaction } from "@/lib/paystack";
import { recordVerifiedPurchase } from "@/lib/purchases";
import { site } from "@/lib/site";
import type { Edition } from "@/lib/types";
import { SecureReader } from "./SecureReader";

export const metadata: Metadata = { title: "Reader" };

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { user, profile } = await getSessionProfile();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/read/${id}`)}`);

  // Service role: buyers keep access even if the edition is later unpublished.
  const admin = createAdminClient();
  const { data: edition } = await admin
    .from("editions")
    .select("*")
    .eq("id", id)
    .single<Edition>();
  if (!edition) notFound();

  const isStaff = hasRole(profile, "editor");

  // Ownership check, with an on-arrival verification fallback: Paystack
  // redirects back with ?reference= before the webhook may have landed.
  const supabase = await createClient();
  let { data: purchase } = await supabase
    .from("purchases")
    .select("reference")
    .eq("edition_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const callbackRef = query.reference ?? query.trxref;
  if (!purchase && callbackRef) {
    const verified = await verifyTransaction(callbackRef);
    if (
      verified &&
      verified.metadata?.user_id === user.id &&
      verified.metadata?.edition_id === id
    ) {
      const result = await recordVerifiedPurchase(verified);
      if (result.ok) purchase = { reference: verified.reference };
    }
  }

  if (!purchase && !isStaff) redirect("/editions");

  // Does a PDF exist for this edition yet?
  const { data: file } = await admin
    .from("edition_files")
    .select("edition_id")
    .eq("edition_id", id)
    .maybeSingle();

  const t = await getTranslations("reader");
  const watermarkRef = purchase?.reference ?? `STAFF-${profile?.role ?? ""}`;

  return (
    <div className="secure-reader flex min-h-screen flex-col bg-neutral-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 bg-neutral-950 px-4 py-3 text-neutral-300">
        <div className="min-w-0">
          <Link href="/" className="font-masthead text-xl font-bold text-white">
            {site.masthead}
          </Link>
          <span className="ml-3 hidden font-serif text-sm sm:inline">
            {edition.title}
          </span>
        </div>
        <p className="max-w-md text-right text-[11px] leading-tight text-neutral-400">
          {t("protectedNotice", { email: user.email })}
        </p>
      </header>

      {file ? (
        <SecureReader
          editionId={id}
          watermark={`${user.email} · ${watermarkRef}`}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-neutral-400">
          <p>{t("notAvailable")}</p>
        </div>
      )}
    </div>
  );
}
