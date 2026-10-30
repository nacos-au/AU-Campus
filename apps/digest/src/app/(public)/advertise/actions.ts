"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { bookingPriceKobo, MAX_WEEKS, MIN_WEEKS, SLOT_DIMENSIONS } from "@/lib/ads";
import type { AdSlot } from "@/lib/types";

export interface BookingState {
  error?: string;
}

const SLOTS: AdSlot[] = ["leaderboard", "sidebar", "infeed"];

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

export async function bookAd(
  _prev: BookingState,
  fd: FormData
): Promise<BookingState> {
  const slot = str(fd, "slot") as AdSlot;
  const weeks = Number(str(fd, "weeks"));
  const advertiser = str(fd, "advertiser");
  const email = str(fd, "email");
  const phone = str(fd, "phone");
  const targetUrl = str(fd, "target_url");
  const startsAt = str(fd, "starts_at");
  const file = fd.get("creative");

  if (!SLOTS.includes(slot)) return { error: "Pick a placement." };
  if (!Number.isInteger(weeks) || weeks < MIN_WEEKS || weeks > MAX_WEEKS)
    return { error: `Choose between ${MIN_WEEKS} and ${MAX_WEEKS} weeks.` };
  if (!advertiser) return { error: "Tell us who is advertising." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (!/^https?:\/\//i.test(targetUrl)) return { error: "Target URL must start with http(s)://." };
  if (!(file instanceof File) || file.size === 0) return { error: "Upload your creative image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Creative must be under 2 MB." };
  if (!file.type.startsWith("image/")) return { error: "Creative must be an image." };

  const start = startsAt ? new Date(startsAt) : new Date();
  if (Number.isNaN(start.getTime())) return { error: "Invalid start date." };
  const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  const price = bookingPriceKobo(slot, weeks);

  const admin = createAdminClient();
  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "img";
  const path = `ads/bookings/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("covers")
    .upload(path, file, { contentType: file.type });
  if (upErr) return { error: upErr.message };
  const image_url = admin.storage.from("covers").getPublicUrl(path).data.publicUrl;

  const { data: ad, error } = await admin
    .from("ads")
    .insert({
      slot,
      label: advertiser,
      advertiser_name: advertiser,
      contact_email: email,
      contact_phone: phone || null,
      target_url: targetUrl,
      image_url,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      price_kobo: price,
      status: "pending_payment",
      active: false,
    })
    .select("id")
    .single();
  if (error || !ad) return { error: error?.message ?? "Could not create booking." };

  const reference = `ad_${ad.id.slice(0, 8)}_${Date.now()}`;
  await admin.from("ads").update({ paystack_reference: reference }).eq("id", ad.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  let url: string;
  try {
    const res = await initializeTransaction({
      email,
      amountKobo: price,
      reference,
      callbackUrl: `${siteUrl}/advertise/confirm`,
      metadata: { ad_id: ad.id, slot, dims: `${SLOT_DIMENSIONS[slot].w}x${SLOT_DIMENSIONS[slot].h}` },
    });
    url = res.authorization_url;
  } catch (e) {
    return { error: (e as Error).message };
  }
  redirect(url);
}
