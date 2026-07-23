"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";
import type { Edition } from "@/lib/types";

export async function buyEdition(editionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect(`/login?next=${encodeURIComponent("/editions")}`);
  }

  const { data: edition } = await supabase
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .eq("published", true)
    .single<Edition>();

  if (!edition) redirect("/editions");

  // Already owned? Straight to the reader.
  const { data: existing } = await supabase
    .from("purchases")
    .select("id")
    .eq("edition_id", editionId)
    .maybeSingle();
  if (existing) redirect(`/read/${editionId}`);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const reference = `ed_${editionId.slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now()}`;

  const { authorization_url } = await initializeTransaction({
    email: user.email,
    amountKobo: edition.price_kobo,
    reference,
    // The reader page verifies the reference on arrival, so purchases unlock
    // even before the webhook lands (vital for local dev without a tunnel).
    callbackUrl: `${siteUrl}/read/${editionId}`,
    metadata: { edition_id: editionId, user_id: user.id },
  });

  redirect(authorization_url);
}
