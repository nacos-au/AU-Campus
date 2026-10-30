import type { Metadata } from "next";
import { SLOT_DIMENSIONS, SLOT_INFO, SLOT_RATES_KOBO } from "@/lib/ads";
import { formatNaira, site } from "@/lib/site";
import type { AdSlot } from "@/lib/types";
import { BookingForm } from "./BookingForm";

export const metadata: Metadata = { title: "Advertise" };

const SLOTS: AdSlot[] = ["leaderboard", "infeed", "sidebar"];

export default function AdvertisePage() {
  return (
    <div className="py-8 md:py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">
          Advertise
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight md:text-5xl">
          Reach the whole campus, not a feed.
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          {site.name} carries a small number of clearly labelled ads from
          campus businesses and partners. Every creative is reviewed by our
          editors before it runs, so your brand sits next to journalism, not
          clutter.
        </p>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {SLOTS.map((s) => (
          <div key={s} className="border border-rule-dark p-5">
            <div
              className="mx-auto w-full border border-dashed border-rule-dark bg-gray-50"
              style={{ aspectRatio: `${SLOT_DIMENSIONS[s].w} / ${SLOT_DIMENSIONS[s].h}`, maxHeight: 160 }}
            />
            <h2 className="mt-4 font-serif text-xl font-bold">{SLOT_INFO[s].name}</h2>
            <p className="text-xs text-ink-soft">
              {SLOT_DIMENSIONS[s].w}×{SLOT_DIMENSIONS[s].h} px · {SLOT_INFO[s].where}
            </p>
            <p className="mt-3 font-serif text-2xl font-bold">
              {formatNaira(SLOT_RATES_KOBO[s])}
              <span className="text-sm font-normal text-ink-soft"> / week</span>
            </p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-[1fr_minmax(0,2fr)]">
        <div>
          <h2 className="font-serif text-2xl font-bold">How it works</h2>
          <ol className="mt-4 space-y-3 text-sm text-ink-soft">
            <li><span className="font-semibold text-ink">1.</span> Pick a placement and how many weeks.</li>
            <li><span className="font-semibold text-ink">2.</span> Upload your creative and pay securely with Paystack.</li>
            <li><span className="font-semibold text-ink">3.</span> Our editors review it within one working day.</li>
            <li><span className="font-semibold text-ink">4.</span> It runs on your start date. Ask us for impression and click numbers any time.</li>
          </ol>
          <p className="mt-6 text-xs text-ink-soft">
            We decline ads for gambling, loans, alcohol, exam malpractice,
            and anything misleading. Sponsored articles are available on
            request and are always marked “Paid post”.
          </p>
        </div>
        <div className="border border-rule-dark p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-bold">Book a placement</h2>
          <div className="mt-5">
            <BookingForm />
          </div>
        </div>
      </section>
    </div>
  );
}
