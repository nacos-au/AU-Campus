import { site } from "@/lib/site";

/** What can sit in the left or right slot beside the nameplate. */
export type MastheadWidget = "motto" | "weather" | "note" | "none";

/** Per-issue masthead settings, stored in `layout.meta.masthead`. */
export interface WeeklyMasthead {
  left?: MastheadWidget;
  right?: MastheadWidget;
  /** Shown when the left or right widget is "motto". Falls back to the site tagline. */
  motto?: string;
  /** Shown when a widget is "note", e.g. "Matchweek 12 edition". */
  note?: string;
  /** Free text that replaces the automatic volume numeral, e.g. "I". */
  volumeOverride?: string;
  /** Free text that replaces the automatic issue number, e.g. "14". */
  issueOverride?: string;
}

export const MASTHEAD_WIDGETS: { value: MastheadWidget; label: string }[] = [
  { value: "motto", label: "Motto" },
  { value: "weather", label: "Campus weather" },
  { value: "note", label: "Short note" },
  { value: "none", label: "Nothing" },
];

const DEFAULTS: Required<Pick<WeeklyMasthead, "left" | "right">> = {
  left: "motto",
  right: "weather",
};

export function resolveMasthead(raw: unknown): WeeklyMasthead & {
  left: MastheadWidget;
  right: MastheadWidget;
} {
  const o = (raw && typeof raw === "object" ? raw : {}) as WeeklyMasthead;
  const pick = (v: unknown, fallback: MastheadWidget): MastheadWidget =>
    MASTHEAD_WIDGETS.some((w) => w.value === v) ? (v as MastheadWidget) : fallback;
  return {
    ...o,
    left: pick(o.left, DEFAULTS.left),
    right: pick(o.right, DEFAULTS.right),
  };
}

/** 1 → I, 4 → IV, 2026 → MMXXVI (Roman numerals, for volume numbers). */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n);
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let rest = n;
  let out = "";
  for (const [value, sym] of table) {
    while (rest >= value) {
      out += sym;
      rest -= value;
    }
  }
  return out;
}

/** Volume for a calendar year: Vol. I in the first year, then +1 each year. */
export function volumeNumberFor(year: number): number {
  return year - site.firstVolumeYear + 1;
}

/**
 * Issue number within its calendar year: the count of live issues in that
 * year up to and including this week. Restarts at 1 when the year changes.
 */
export function issueNumberFor(weekStart: string, liveWeekStarts: string[]): number {
  const year = weekStart.slice(0, 4);
  const earlier = liveWeekStarts.filter(
    (w) => w.slice(0, 4) === year && w <= weekStart
  );
  const unique = new Set(earlier);
  if (!unique.has(weekStart)) unique.add(weekStart);
  return unique.size;
}

export interface DatelineNumbers {
  volume: string;
  issue: string;
}

export function datelineNumbers(
  weekStart: string,
  liveWeekStarts: string[],
  override?: Pick<WeeklyMasthead, "volumeOverride" | "issueOverride">
): DatelineNumbers {
  const year = Number(weekStart.slice(0, 4));
  return {
    volume: override?.volumeOverride?.trim() || toRoman(volumeNumberFor(year)),
    issue:
      override?.issueOverride?.trim() ||
      String(issueNumberFor(weekStart, liveWeekStarts)),
  };
}
