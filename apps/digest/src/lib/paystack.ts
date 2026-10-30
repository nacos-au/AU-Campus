import "server-only";
import crypto from "crypto";

const PAYSTACK_API = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export interface InitializeResult {
  authorization_url: string;
  reference: string;
}

export async function initializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}): Promise<InitializeResult> {
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: "NGN",
      metadata: params.metadata,
    }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message ?? "Paystack initialization failed");
  }
  return {
    authorization_url: json.data.authorization_url,
    reference: json.data.reference,
  };
}

export interface VerifiedTransaction {
  status: string;
  amount: number;
  reference: string;
  metadata: { edition_id?: string; user_id?: string; ad_id?: string } | null;
  customerEmail: string | null;
}

/** Server-to-server verification — the source of truth for payment status. */
export async function verifyTransaction(
  reference: string
): Promise<VerifiedTransaction | null> {
  const res = await fetch(
    `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
      cache: "no-store",
    }
  );
  const json = await res.json();
  if (!res.ok || !json.status) return null;

  return {
    status: json.data.status,
    amount: json.data.amount,
    reference: json.data.reference,
    metadata: json.data.metadata ?? null,
    customerEmail: json.data.customer?.email ?? null,
  };
}

/** Validates the signature Paystack sends with every webhook. */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", secretKey())
    .update(rawBody)
    .digest("hex");
  return (
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
