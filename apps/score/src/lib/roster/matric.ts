/**
 * Achievers University matric format: AU23AC5696
 * AU + 2-digit year + 2-letter faculty/dept code + 4 digits
 */
export const MATRIC_EXAMPLE = "AU23AC5696";

export const MATRIC_HINT = "AU + year + dept code + number — e.g. AU23AC5696";

/** Current compact form. */
export const MATRIC_COMPACT_RE = /^AU\d{2}[A-Za-z]{2}\d{4}$/i;

/** Legacy slash/dash forms still accepted on paste. */
const MATRIC_LEGACY_RE = /^AU[\/-][A-Za-z0-9]+(?:[\/-][A-Za-z0-9]+){1,4}$/i;

export function isMatricNumber(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  return MATRIC_COMPACT_RE.test(v) || MATRIC_LEGACY_RE.test(v);
}

export function normaliseMatric(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return v.toUpperCase();
}
