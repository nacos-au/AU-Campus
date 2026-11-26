import type { WeeklyIssue, WeeklyIssueStatus } from "@/lib/types";
import { toRoman, volumeNumberFor } from "@/lib/weekly-masthead";

/* ─────────────────────────────────────────────────────────────────────────
 * Publish-date model
 *
 * Each weekly issue stores ONE canonical publish date (`publish_date`).
 * Everything printed on the nameplate is derived from it, so moving the date
 * renumbers the issue automatically:
 *
 *   volume  = Roman numeral of the calendar year (Vol. I = 2026, see
 *             site.firstVolumeYear)
 *   number  = position within that year, restarting at No. 1 each January
 *   week    = ISO-8601 week number of the date
 *   title   = "Week 48 · November 26, 2026"
 *
 * `week_start` (Monday) is kept in the table as a derived, unique "slot" key
 * so there is at most one issue per calendar week and old links keep working.
 * ───────────────────────────────────────────────────────────────────────── */

/** Noon UTC for a YYYY-MM-DD string — immune to DST / timezone drift. */
function isoToUtc(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Today as YYYY-MM-DD in the viewer's local calendar. */
export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Monday (YYYY-MM-DD) for the calendar week containing `d`. */
export function mondayOf(d: Date = new Date()): string {
  return mondayOfIso(todayIso(d));
}

export function mondayOfIso(iso: string): string {
  const x = isoToUtc(iso);
  const day = x.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x.toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = isoToUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekEndSunday(weekStart: string): string {
  return addDaysIso(weekStart, 6);
}

/** ISO-8601 week number (1–53). */
export function isoWeekNumber(iso: string): number {
  const d = isoToUtc(iso);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this ISO week
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** Vol. I is `site.firstVolumeYear` (2026); +1 each calendar year. */
export function volumeFor(iso: string): {
  year: number;
  volume: number;
  roman: string;
} {
  const year = Number(iso.slice(0, 4));
  const volume = Math.max(1, volumeNumberFor(year));
  return { year, volume, roman: toRoman(volume) };
}

export function formatLongDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(isoToUtc(iso));
}

export function formatShortDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(isoToUtc(iso));
}

/** Legacy helper — formats a week_start Monday. */
export function formatWeekLabel(weekStart: string, locale = "en-US"): string {
  return formatShortDate(weekStart, locale);
}

/** "Week 48 · November 26, 2026" — stored in `title` for back-compat. */
export function displayTitle(iso: string, locale = "en-US"): string {
  const date = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(isoToUtc(iso));
  return `Week ${isoWeekNumber(iso)} · ${date}`;
}

type IssueRef = Pick<WeeklyIssue, "week_start" | "status"> & {
  id?: string;
  publish_date?: string | null;
};

/** The canonical date; falls back to the Monday for pre-migration rows. */
export function effectivePublishDate(
  issue: Pick<WeeklyIssue, "week_start"> & { publish_date?: string | null }
): string {
  return issue.publish_date || issue.week_start;
}

/** Statuses that "hold" an issue number. Drafts only reserve a prospective one. */
function countsTowardNumbering(status: WeeklyIssueStatus): boolean {
  return status === "published" || status === "scheduled";
}

/**
 * Issue number within the calendar year: 1 + the count of other
 * published/scheduled issues of the same year that come earlier.
 */
export function issueNumberFor(
  iso: string,
  issues: IssueRef[],
  selfId?: string
): number {
  const year = iso.slice(0, 4);
  let before = 0;
  for (const other of issues) {
    if (selfId && other.id === selfId) continue;
    if (!countsTowardNumbering(other.status)) continue;
    const d = effectivePublishDate(other);
    if (d.slice(0, 4) !== year) continue;
    if (d < iso) before += 1;
  }
  return before + 1;
}

export type IssueMeta = {
  publishDate: string;
  weekStart: string;
  year: number;
  volume: number;
  volumeRoman: string;
  number: number;
  weekNo: number;
  title: string;
  dateLong: string;
  folio: string;
};

export function issueMeta(
  publishDate: string,
  issues: IssueRef[],
  selfId?: string,
  locale = "en-US"
): IssueMeta {
  const vol = volumeFor(publishDate);
  const number = issueNumberFor(publishDate, issues, selfId);
  return {
    publishDate,
    weekStart: mondayOfIso(publishDate),
    year: vol.year,
    volume: vol.volume,
    volumeRoman: vol.roman,
    number,
    weekNo: isoWeekNumber(publishDate),
    title: displayTitle(publishDate, locale),
    dateLong: formatLongDate(publishDate, locale),
    folio: `Vol. ${vol.roman} · No. ${number}`,
  };
}

/** First publish date (stepping weekly from `from`) whose week has no issue. */
export function nextFreeDate(
  issues: Pick<WeeklyIssue, "week_start">[],
  from = todayIso()
): string {
  let d = from;
  for (let i = 0; i < 120; i += 1) {
    const monday = mondayOfIso(d);
    if (!issues.some((x) => x.week_start === monday)) return d;
    d = addDaysIso(d, 7);
  }
  return d;
}

export function isLiveIssue(
  issue: Pick<WeeklyIssue, "status" | "scheduled_at">,
  now = new Date()
): boolean {
  if (issue.status === "published") return true;
  if (issue.status === "scheduled" && issue.scheduled_at) {
    return new Date(issue.scheduled_at).getTime() <= now.getTime();
  }
  return false;
}
