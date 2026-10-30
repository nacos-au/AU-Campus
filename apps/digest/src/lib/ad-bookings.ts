import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VerifiedTransaction } from "@/lib/paystack";

/** Marks a booking paid once Paystack confirms it. Idempotent. */
export async function recordAdPayment(
  tx: VerifiedTransaction
): Promise<{ ok: boolean; reason?: string }> {
  if (tx.status !== "success") return { ok: false, reason: "not successful" };
  const adId = tx.metadata?.ad_id;
  if (!adId) return { ok: false, reason: "missing ad_id" };

  const admin = createAdminClient();
  const { data: ad } = await admin
    .from("ads")
    .select("id, price_kobo, status, paystack_reference")
    .eq("id", adId)
    .single();
  if (!ad) return { ok: false, reason: "unknown booking" };
  if (ad.paystack_reference !== tx.reference) {
    return { ok: false, reason: "reference mismatch" };
  }
  if (tx.amount < ad.price_kobo) {
    return { ok: false, reason: "amount below booking price" };
  }
  if (ad.status !== "pending_payment") return { ok: true };

  const { error } = await admin
    .from("ads")
    .update({ paid_at: new Date().toISOString(), status: "pending_review" })
    .eq("id", adId)
    .eq("status", "pending_payment");
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
