import { NextResponse } from "next/server";
import { isValidWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { recordVerifiedPurchase } from "@/lib/purchases";

export const runtime = "nodejs";

/**
 * Paystack webhook. Two layers of verification:
 *  1. HMAC-SHA512 signature over the raw body (proves Paystack sent it).
 *  2. A verify API call for the reference (proves the charge really succeeded,
 *     and gives us server-fetched amount/metadata rather than trusting the body).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Always 200 for events we don't act on, so Paystack stops retrying.
  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ received: true });
  }

  const verified = await verifyTransaction(event.data.reference);
  if (!verified) {
    // Transient verify failure: 500 makes Paystack retry later.
    return NextResponse.json({ error: "verification failed" }, { status: 500 });
  }

  const result = await recordVerifiedPurchase(verified);
  if (!result.ok) {
    console.error("[paystack webhook] purchase rejected:", result.reason);
  }

  return NextResponse.json({ received: true });
}
