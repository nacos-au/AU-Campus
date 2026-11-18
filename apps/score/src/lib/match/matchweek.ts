import { format } from "date-fns";
import type { Match } from "@/lib/types/database";

/** Africa/Lagos offset for week boundaries (WAT = UTC+1, no DST). */
const WAT_OFFSET_MS = 60 * 60 * 1000;

export type CalendarWeek = {
  /** Sunday date key yyyy-MM-dd in WAT */
  key: string;
  startMs: number;
  endMs: number;
  label: string;
};

function toWatParts(isoOrDate: string | Date): {
  y: number;
  m: number;
  d: number;
  day: number;
} {
  const t =
    typeof isoOrDate === "string" ? new Date(isoOrDate).getTime() : isoOrDate.getTime();
  const wat = new Date(t + WAT_OFFSET_MS);
  return {
    y: wat.getUTCFullYear(),
    m: wat.getUTCMonth(),
    d: wat.getUTCDate(),
    day: wat.getUTCDay(),
  };
}

/** Sunday 00:00 WAT → UTC ms for the week containing `when`. */
export function sundayWeekStartMs(when: string | Date = new Date()): number {
  const { y, m, d, day } = toWatParts(when);
  // noon UTC of that WAT calendar day, then step back to Sunday
  const noonUtc = Date.UTC(y, m, d, 11, 0, 0) - WAT_OFFSET_MS;
  const sundayNoon = noonUtc - day * 24 * 60 * 60 * 1000;
  const { y: sy, m: sm, d: sd } = toWatParts(new Date(sundayNoon));
  return Date.UTC(sy, sm, sd, 0, 0, 0) - WAT_OFFSET_MS;
}

export function weekKeyFromStartMs(startMs: number): string {
  const { y, m, d } = toWatParts(new Date(startMs));
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function calendarWeekFromKey(key: string): CalendarWeek | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const startMs = Date.UTC(y, mo, d, 0, 0, 0) - WAT_OFFSET_MS;
  const endMs = startMs + 7 * 24 * 60 * 60 * 1000 - 1;
  const startLabel = format(new Date(startMs + WAT_OFFSET_MS), "d MMM");
  const endLabel = format(new Date(endMs), "d MMM");
  return {
    key,
    startMs,
    endMs,
    label: startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`,
  };
}

export function weekOfMatch(match: Pick<Match, "scheduled_at">): CalendarWeek {
  const startMs = sundayWeekStartMs(match.scheduled_at);
  const key = weekKeyFromStartMs(startMs);
  return calendarWeekFromKey(key)!;
}

export function collectCalendarWeeks(matches: Match[]): CalendarWeek[] {
  const byKey = new Map<string, CalendarWeek>();
  for (const m of matches) {
    const w = weekOfMatch(m);
    byKey.set(w.key, w);
  }
  return [...byKey.values()].sort((a, b) => a.startMs - b.startMs);
}

export function filterByCalendarWeek(
  matches: Match[],
  mw: string | "all"
): Match[] {
  if (mw === "all") return matches;
  const week = calendarWeekFromKey(mw);
  if (!week) return matches;
  return matches.filter((m) => {
    const t = new Date(m.scheduled_at).getTime();
    return t >= week.startMs && t <= week.endMs;
  });
}

export type MatchListStatusFilter = "all" | "live" | "upcoming" | "finished";

export function filterByStatusBucket(
  matches: Match[],
  status: MatchListStatusFilter
): Match[] {
  if (status === "all") return matches;
  if (status === "live") {
    return matches.filter((m) => m.status === "live" || m.status === "paused");
  }
  if (status === "upcoming") {
    return matches.filter((m) => m.status === "scheduled" || m.status === "postponed");
  }
  return matches.filter((m) => m.status === "completed");
}

/**
 * Default = current Sun–Sat week when it appears in `weeks`, else nearest week
 * with fixtures. Explicit `all` stays all.
 */
export function parseMwParam(
  raw: string | undefined | null,
  weeks: CalendarWeek[],
  now: Date = new Date()
): string | "all" {
  if (raw === "all") return "all";
  if (raw && weeks.some((w) => w.key === raw)) return raw;

  if (!weeks.length) return "all";

  const currentKey = weekKeyFromStartMs(sundayWeekStartMs(now));
  if (weeks.some((w) => w.key === currentKey)) return currentKey;

  const nowMs = now.getTime();
  let best = weeks[0];
  let bestDist = Math.abs(best.startMs - nowMs);
  for (const w of weeks) {
    const mid = (w.startMs + w.endMs) / 2;
    const dist = Math.abs(mid - nowMs);
    if (dist < bestDist) {
      best = w;
      bestDist = dist;
    }
  }
  return best.key;
}

export function parseStatusParam(raw: string | undefined | null): MatchListStatusFilter {
  if (raw === "live" || raw === "upcoming" || raw === "finished" || raw === "all") return raw;
  return "all";
}

export function matchweekNavMeta(
  matches: Match[],
  mw: string | "all"
): { label: string; range: string } {
  if (mw === "all") {
    if (matches.length === 0) return { label: "All weeks", range: "No fixtures" };
    const times = matches
      .map((m) => new Date(m.scheduled_at).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
    if (!times.length) return { label: "All weeks", range: "" };
    const from = format(new Date(times[0]), "EEE d MMM");
    const to = format(new Date(times[times.length - 1]), "EEE d MMM");
    return { label: "All weeks", range: from === to ? from : `${from} – ${to}` };
  }

  const week = calendarWeekFromKey(mw);
  if (!week) return { label: "Matchweek", range: "" };
  return { label: `Matchweek · ${week.label}`, range: "Sun – Sat" };
}

export function competitionInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "AU";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** @deprecated use calendar weeks */
export function matchweekOf(match: Pick<Match, "competition_phase"> | null | undefined): number | null {
  const phase = match?.competition_phase?.trim();
  if (!phase) return null;
  const mw = /^matchweek[_-]?(\d+)$/i.exec(phase);
  if (mw) return Number(mw[1]);
  const md = /^matchday[_-]?(\d+)$/i.exec(phase);
  if (md) return Number(md[1]);
  return null;
}

export function collectMatchweeks(matches: Match[]): number[] {
  return collectCalendarWeeks(matches).map((_, i) => i + 1);
}

export function filterByMatchweek(matches: Match[], mw: number | "all"): Match[] {
  if (mw === "all") return matches;
  const weeks = collectCalendarWeeks(matches);
  const week = weeks[mw - 1];
  if (!week) return [];
  return filterByCalendarWeek(matches, week.key);
}
