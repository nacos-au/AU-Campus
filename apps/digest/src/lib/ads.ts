import type { Ad, AdSlot } from "@/lib/types";

/** Pixel dimensions of each placement. Creatives must match. */
export const SLOT_DIMENSIONS: Record<AdSlot, { w: number; h: number }> = {
  leaderboard: { w: 970, h: 250 },
  sidebar: { w: 300, h: 600 },
  infeed: { w: 600, h: 400 },
};

/** Rate card — price per week, in kobo. Edit here to change public pricing. */
export const SLOT_RATES_KOBO: Record<AdSlot, number> = {
  leaderboard: 2_500_000,
  sidebar: 1_500_000,
  infeed: 2_000_000,
};

export const SLOT_INFO: Record<
  AdSlot,
  { name: string; where: string }
> = {
  leaderboard: {
    name: "Leaderboard",
    where: "Top of the front page and every section",
  },
  sidebar: {
    name: "Sidebar",
    where: "Right rail of the front page",
  },
  infeed: {
    name: "In-feed",
    where: "Below every article and within section feeds",
  },
};

export const MIN_WEEKS = 1;
export const MAX_WEEKS = 12;

export function bookingPriceKobo(slot: AdSlot, weeks: number): number {
  const w = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, Math.round(weeks)));
  return SLOT_RATES_KOBO[slot] * w;
}

/** Approved, active, and inside its flight window (if any). */
export function isLive(ad: Ad, now = new Date()): boolean {
  if (!ad.active) return false;
  if (ad.status && ad.status !== "approved") return false;
  if (ad.starts_at && new Date(ad.starts_at) > now) return false;
  if (ad.ends_at && new Date(ad.ends_at) <= now) return false;
  return true;
}

/** Weighted random pick among live ads (fresh pick per request). */
export function pickAd(ads: Ad[], now = new Date()): Ad | null {
  const live = ads.filter((a) => isLive(a, now));
  if (live.length === 0) return null;
  const total = live.reduce((s, a) => s + (a.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const a of live) {
    r -= a.weight ?? 1;
    if (r <= 0) return a;
  }
  return live[live.length - 1];
}
