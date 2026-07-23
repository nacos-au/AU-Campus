/**
 * Per-university deployment config.
 * To white-label this platform for another institution, change these values
 * (and the accent color variables in `src/app/globals.css`).
 */
export const site = {
  /** Short name used in the UI and metadata. */
  name: "AU Digest",
  /** Full masthead line rendered in the masthead font on the front page. */
  masthead: "The AU Digest",
  university: "Achievers University",
  tagline: "All the campus news that's fit to publish.",
  address: "KM 1 Idasen/Uteh Road, Owo 341104, Ondo, Nigeria",
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
