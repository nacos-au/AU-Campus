/**
 * Links editors can add to formatted text. Only web, mail and site-relative
 * addresses are allowed, so nothing can run as script (javascript:, data:).
 * Returns the normalised address, or null if it should not be linked.
 */
export function safeHref(raw: string | null | undefined): string | null {
  const v = String(raw ?? "").trim();
  if (!v || v.length > 2048) return null;
  if (/[\u0000-\u001f\s]/.test(v)) return null;
  if (v.startsWith("//")) return null; // protocol-relative: could leave the site
  if (v.startsWith("/")) return v;
  if (/^https?:\/\/[^\s]+$/i.test(v)) {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch {
      return null;
    }
  }
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(v)) return v;
  return null;
}

/** Is this link external (opens in a new tab, rel=noopener)? */
export function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:)/i.test(href);
}
