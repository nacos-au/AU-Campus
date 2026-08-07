/**
 * Actionable form / API errors — always tell the user what to fix.
 */
export function fieldError(message: string): string {
  return message.trim();
}

export function joinErrors(errors: Array<string | null | undefined>): string | null {
  const list = errors.filter((e): e is string => Boolean(e && e.trim()));
  if (list.length === 0) return null;
  return list.join(" ");
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object" && "message" in err) {
    const m = String((err as { message: unknown }).message ?? "").trim();
    if (m) return m;
  }
  return fallback;
}
