import { format } from "date-fns";
import type { Match } from "@/lib/types/database";

/** Parse matchweek_N / matchday_N from competition_phase. */
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
  const set = new Set<number>();
  for (const m of matches) {
    const w = matchweekOf(m);
    if (w != null) set.add(w);
  }
  return [...set].sort((a, b) => a - b);
}

export function filterByMatchweek(matches: Match[], mw: number | "all"): Match[] {
  if (mw === "all") return matches;
  return matches.filter((m) => matchweekOf(m) === mw);
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

export function parseMwParam(raw: string | undefined | null, weeks: number[]): number | "all" {
  if (!raw || raw === "all") return "all";
  const n = Number(raw);
  if (!Number.isFinite(n) || !weeks.includes(n)) {
    return weeks[0] ?? "all";
  }
  return n;
}

export function parseStatusParam(raw: string | undefined | null): MatchListStatusFilter {
  if (raw === "live" || raw === "upcoming" || raw === "finished" || raw === "all") return raw;
  return "all";
}

export function matchweekNavMeta(
  matches: Match[],
  mw: number | "all"
): { label: string; range: string } {
  if (mw === "all") {
    if (matches.length === 0) return { label: "All matchweeks", range: "No fixtures" };
    const times = matches
      .map((m) => new Date(m.scheduled_at).getTime())
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b);
    if (!times.length) return { label: "All matchweeks", range: "" };
    const from = format(new Date(times[0]), "EEE d MMM");
    const to = format(new Date(times[times.length - 1]), "EEE d MMM");
    return { label: "All matchweeks", range: from === to ? from : `${from} – ${to}` };
  }

  const weekMatches = filterByMatchweek(matches, mw);
  const times = weekMatches
    .map((m) => new Date(m.scheduled_at).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  const label = `Matchweek ${mw}`;
  if (!times.length) return { label, range: "No fixtures" };
  const from = format(new Date(times[0]), "EEE d MMM");
  const to = format(new Date(times[times.length - 1]), "EEE d MMM");
  return { label, range: from === to ? from : `${from} – ${to}` };
}

export function competitionInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "AU";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
