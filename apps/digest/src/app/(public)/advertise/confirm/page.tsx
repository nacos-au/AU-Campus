import Link from "next/link";
import type { Metadata } from "next";
import { verifyTransaction } from "@/lib/paystack";
import { recordAdPayment } from "@/lib/ad-bookings";

export const metadata: Metadata = { title: "Booking received" };

export default async function AdvertiseConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const sp = await searchParams;
  const ref = sp.reference ?? sp.trxref ?? "";
  let ok = false;
  if (ref) {
    const tx = await verifyTransaction(ref);
    if (tx) ok = (await recordAdPayment(tx)).ok;
  }

  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <h1 className="font-serif text-3xl font-bold">
        {ok ? "Payment received" : "We’re confirming your payment"}
      </h1>
      <p className="mt-4 text-ink-soft">
        {ok
          ? "Thank you. Our editors will review the creative within one working day and your campaign goes live on its start date. You’ll hear from us by email."
          : "If you completed payment, it will be confirmed shortly. If anything looks wrong, reply to the Paystack receipt and we’ll sort it out."}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper"
      >
        Back to the paper
      </Link>
    </div>
  );
}
