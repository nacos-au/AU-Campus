import type { Ad } from "@/lib/types";

/** Rotates fairly among a slot's active ads (fresh pick per request). */
export function pickAd(ads: Ad[]): Ad | null {
  if (ads.length === 0) return null;
  return ads[Math.floor(Math.random() * ads.length)];
}
