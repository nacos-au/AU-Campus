import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VerifiedTransaction } from "@/lib/paystack";

/**
 * Records a purchase after Paystack has confirmed it server-to-server.
 * Called from the webhook and from the on-demand verify fallback; idempotent
 * via the unique constraints on (reference) and (user_id, edition_id).
 */
export async function recordVerifiedPurchase(
  tx: VerifiedTransaction
): Promise<{ ok: boolean; reason?: string }> {
  if (tx.status !== "success") return { ok: false, reason: "not successful" };

  const editionId = tx.metadata?.edition_id;
  const userId = tx.metadata?.user_id;
  if (!editionId || !userId) return { ok: false, reason: "missing metadata" };

  const admin = createAdminClient();

  const { data: edition } = await admin
    .from("editions")
    .select("id, price_kobo")
    .eq("id", editionId)
    .single();
  if (!edition) return { ok: false, reason: "unknown edition" };

  // Reject underpayment (e.g. a tampered init request replayed with a lower amount).
  if (tx.amount < edition.price_kobo) {
    return { ok: false, reason: "amount below edition price" };
  }

  const { error } = await admin.from("purchases").upsert(
    {
      user_id: userId,
      edition_id: editionId,
      reference: tx.reference,
      amount_kobo: tx.amount,
    },
    { onConflict: "user_id,edition_id", ignoreDuplicates: true }
  );

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/** True if the user owns this edition (RLS-independent, service role). */
export async function userOwnsEdition(
  userId: string,
  editionId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("edition_id", editionId)
    .maybeSingle();
  return !!data;
}
