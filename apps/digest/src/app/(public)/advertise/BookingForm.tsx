"use client";

import { useActionState, useState } from "react";
import { bookAd, type BookingState } from "./actions";
import {
  bookingPriceKobo,
  MAX_WEEKS,
  MIN_WEEKS,
  SLOT_DIMENSIONS,
  SLOT_INFO,
} from "@/lib/ads";
import { formatNaira } from "@/lib/site";
import type { AdSlot } from "@/lib/types";

const SLOTS: AdSlot[] = ["leaderboard", "infeed", "sidebar"];
const field =
  "mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
const label = "block text-xs font-semibold uppercase tracking-wide text-ink-soft";

export function BookingForm() {
  const [slot, setSlot] = useState<AdSlot>("leaderboard");
  const [weeks, setWeeks] = useState(2);
  const [state, action, pending] = useActionState<BookingState, FormData>(
    bookAd,
    {}
  );
  const dim = SLOT_DIMENSIONS[slot];

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Placement
          <select
            name="slot"
            value={slot}
            onChange={(e) => setSlot(e.target.value as AdSlot)}
            className={field}
          >
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                {SLOT_INFO[s].name} · {SLOT_DIMENSIONS[s].w}×{SLOT_DIMENSIONS[s].h}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Weeks
          <input
            name="weeks"
            type="number"
            min={MIN_WEEKS}
            max={MAX_WEEKS}
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value) || MIN_WEEKS)}
            className={field}
          />
        </label>
        <label className={label}>
          Start date
          <input name="starts_at" type="date" className={field} />
        </label>
        <label className={label}>
          Business / advertiser
          <input name="advertiser" required placeholder="Campus Bookshop" className={field} />
        </label>
        <label className={label}>
          Email
          <input name="email" type="email" required className={field} />
        </label>
        <label className={label}>
          Phone (optional)
          <input name="phone" type="tel" className={field} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Where should clicks go?
          <input name="target_url" type="url" required placeholder="https://" className={field} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Creative image ({dim.w}×{dim.h} px, under 2 MB)
          <input name="creative" type="file" accept="image/*" required className="mt-1 block w-full text-sm" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
        <p className="text-sm">
          <span className="text-ink-soft">Total</span>{" "}
          <span className="font-serif text-2xl font-bold">
            {formatNaira(bookingPriceKobo(slot, weeks))}
          </span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="bg-accent px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Redirecting…" : "Pay with Paystack"}
        </button>
      </div>

      {state.error && (
        <p className="border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {state.error}
        </p>
      )}
    </form>
  );
}
