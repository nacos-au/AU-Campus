import type { CampusFact, CampusWord } from "@/lib/types";

const LAGOS_TZ = "Africa/Lagos";

/** Calendar YYYY-MM-DD in Africa/Lagos. */
export function lagosDateIso(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Day ordinal for rotation (UTC midnight of Lagos calendar date). */
export function lagosDayNumber(d = new Date()): number {
  const iso = lagosDateIso(d);
  return Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 86_400_000);
}

export function pickRotating<T>(items: T[], d = new Date()): T | null {
  if (!items.length) return null;
  return items[lagosDayNumber(d) % items.length] ?? null;
}

export function sortLore<T extends { sort_order: number; created_at?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

export function todaysWord(words: CampusWord[], d = new Date()): CampusWord | null {
  return pickRotating(
    sortLore(words.filter((w) => w.active)),
    d
  );
}

export function todaysFact(facts: CampusFact[], d = new Date()): CampusFact | null {
  return pickRotating(
    sortLore(facts.filter((f) => f.active)),
    d
  );
}
