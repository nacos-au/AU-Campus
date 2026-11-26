/**
 * Per-deployment branding for AUSA Digest.
 */
export const site = {
  /** Short name used in the UI and metadata. */
  name: "AUSA Digest",
  /** Full masthead line rendered in the masthead font on the front page. */
  masthead: "The AUSA Digest",
  /** Organization — Students' Association (not the university crest). */
  university: "Achievers University Students' Association",
  tagline: "All the campus news that's fit to publish.",
  address: "KM 1 Idasen/Uteh Road, Owo 341104, Ondo, Nigeria",
  /** Calendar year of Volume I. Volumes advance each calendar year. */
  firstVolumeYear: 2026,
  /** ISO currency for Paystack (NGN only on most Paystack accounts). */
  currency: "NGN" as const,
} as const;

export function formatNaira(amountKobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(amountKobo / 100);
}
