/**
 * Soft feature gates for Digest.
 * Paused surfaces stay in the codebase but are hidden from nav / public UI.
 */
export const digestFeatures = {
  forum: false,
  talent: false,
  printEditions: false,
  publicLikes: true,
  adsenseFallback: false,
  weekly: true,
  /** Ads paused for now — AdSlots and advertise links stay gated off. */
  manualAds: false,
  breakingNews: true,
} as const;

/** Desks shown on the public site and homepage section blocks. */
export const PUBLIC_SECTION_SLUGS = [
  "academics",
  "campus",
  "sports",
  "technology",
] as const;

export type PublicSectionSlug = (typeof PUBLIC_SECTION_SLUGS)[number];

export function isPublicSectionSlug(slug: string): boolean {
  return (PUBLIC_SECTION_SLUGS as readonly string[]).includes(slug);
}
