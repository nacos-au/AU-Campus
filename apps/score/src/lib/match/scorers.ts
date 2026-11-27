import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { displayMatchTime } from "@/lib/match/timeline";

export interface ScorerMinute {
  /** Display label such as `23'` or `90+3'`. Null when the minute was not logged. */
  label: string | null;
  tag: "OG" | "P" | null;
  sortKey: number;
}

export interface ScorerLine {
  key: string;
  name: string;
  minutes: ScorerMinute[];
}

export interface ScorersByTeam {
  home: ScorerLine[];
  away: ScorerLine[];
}

const GOAL_TYPES = new Set(["goal", "penalty_scored", "own_goal"]);

/** Chronological sort key: 23 -> 23, 90+3 -> 93.03, ET 105 -> 105. */
export function minuteSortKey(matchTime: string): number {
  const t = matchTime.trim();
  const et = t.match(/ET\s*(\d+)/i);
  if (et) return Number(et[1]);
  const stoppage = t.match(/(\d+)\+(\d+)/);
  if (stoppage) return Number(stoppage[1]) + Number(stoppage[2]) / 100;
  const basic = t.match(/(\d+)/);
  return basic ? Number(basic[1]) : Number.POSITIVE_INFINITY;
}

function scorerName(event: DemoMatchEvent): string {
  const full = `${event.player?.first_name ?? ""} ${event.player?.last_name ?? ""}`.trim();
  if (full) return full;
  const fromDetails = event.details?.player_name;
  return typeof fromDetails === "string" && fromDetails.trim() ? fromDetails.trim() : "Unknown";
}

/**
 * Goal scorers per side for the match banner.
 * Own goals are credited to the team that benefits (the opponent), tagged OG.
 * Penalties are tagged P. Shootout kicks are excluded. Score-only records return empty lists.
 */
export function buildScorers(
  events: DemoMatchEvent[],
  homeTeamId: string,
  awayTeamId: string
): ScorersByTeam {
  const goals = events
    .filter((e) => GOAL_TYPES.has(e.event_type) && e.period !== "penalty_shootout")
    .sort((a, b) => minuteSortKey(b.match_time) - minuteSortKey(a.match_time));

  const home = new Map<string, ScorerLine>();
  const away = new Map<string, ScorerLine>();

  for (const event of goals) {
    const scoredFor =
      event.event_type === "own_goal"
        ? event.team_id === homeTeamId
          ? "away"
          : event.team_id === awayTeamId
            ? "home"
            : null
        : event.team_id === homeTeamId
          ? "home"
          : event.team_id === awayTeamId
            ? "away"
            : null;
    if (!scoredFor) continue;

    const name = scorerName(event);
    const key = event.player?.id || name;
    const bucket = scoredFor === "home" ? home : away;
    const line = bucket.get(key) ?? { key, name, minutes: [] };
    const label = displayMatchTime(event.match_time, "football");
    line.minutes.push({
      label,
      tag: event.event_type === "own_goal" ? "OG" : event.event_type === "penalty_scored" ? "P" : null,
      sortKey: minuteSortKey(event.match_time),
    });
    bucket.set(key, line);
  }

  const finish = (bucket: Map<string, ScorerLine>) =>
    [...bucket.values()].map((line) => ({
      ...line,
      minutes: [...line.minutes].sort((a, b) => a.sortKey - b.sortKey),
    }));

  return { home: finish(home), away: finish(away) };
}

/** Plain text like `Matteo Soria 18', 15' (P)` for accessibility labels. */
export function formatScorerLine(line: ScorerLine): string {
  const parts = line.minutes.map((m) => {
    const base = m.label ?? "";
    return m.tag ? `${base} (${m.tag})`.trim() : base;
  });
  const filled = parts.filter(Boolean);
  return filled.length ? `${line.name} ${filled.join(", ")}` : line.name;
}
