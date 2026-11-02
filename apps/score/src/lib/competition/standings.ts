import { footballPointsForResult } from "@/lib/competition/football-points";
import type { Match, StandingRow } from "@/lib/types/database";

/**
 * Rebuild a simple league table from completed official matches.
 * Sort: Pts → GD → GF (H2H later).
 */
export function recomputeStandingsFromMatches(
  matches: Match[],
  teams: Array<{ id: string; name: string; short_code?: string | null; logo_url?: string | null }>
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) {
    rows.set(t.id, {
      team_id: t.id,
      team_name: t.name,
      short_code: t.short_code ?? "AU",
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [],
      logo_url: t.logo_url,
    });
  }

  const completed = matches.filter(
    (m) => m.status === "completed" && m.home_team_id && m.away_team_id && !m.deleted_at
  );

  for (const m of completed) {
    const homeId = m.home_team_id!;
    const awayId = m.away_team_id!;
    const home = rows.get(homeId);
    const away = rows.get(awayId);
    if (!home || !away) continue;

    const hg = m.home_score;
    const ag = m.away_score;
    home.played += 1;
    away.played += 1;
    home.goals_for += hg;
    home.goals_against += ag;
    away.goals_for += ag;
    away.goals_against += hg;

    const homePts = footballPointsForResult(hg, ag);
    const awayPts = footballPointsForResult(ag, hg);
    home.points += homePts;
    away.points += awayPts;

    if (hg > ag) {
      home.won += 1;
      away.lost += 1;
      home.form = [...home.form.slice(-4), "W"];
      away.form = [...away.form.slice(-4), "L"];
    } else if (hg < ag) {
      away.won += 1;
      home.lost += 1;
      home.form = [...home.form.slice(-4), "L"];
      away.form = [...away.form.slice(-4), "W"];
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.form = [...home.form.slice(-4), "D"];
      away.form = [...away.form.slice(-4), "D"];
    }

    home.goal_difference = home.goals_for - home.goals_against;
    away.goal_difference = away.goals_for - away.goals_against;
  }

  return [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    return b.goals_for - a.goals_for;
  });
}
