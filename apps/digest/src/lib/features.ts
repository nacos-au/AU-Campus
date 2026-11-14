/**
 * Soft feature gates for the live Digest demo.
 * Paused surfaces stay in the codebase but are hidden from nav / public UI.
 */
export const digestFeatures = {
  forum: false,
  talent: false,
  printEditions: false,
  publicLikes: false,
  adsenseFallback: false,
  weekly: true,
  manualAds: true,
  breakingNews: true,
} as const;

/** Desks shown on the public site and homepage section blocks. */
export const PUBLIC_SECTION_SLUGS = ["news", "campus", "sports"] as const;

export type PublicSectionSlug = (typeof PUBLIC_SECTION_SLUGS)[number];

export function isPublicSectionSlug(slug: string): boolean {
  return (PUBLIC_SECTION_SLUGS as readonly string[]).includes(slug);
}
