import type { DemoMatchEvent } from "@/lib/data/demo-match-details";

export interface MatchStatRow {
  label: string;
  home: number;
  away: number;
  /** Stats the keeper can log — possession is excluded (not objectively trackable) */
  keeperTracked: boolean;
}

/** Demo stats for matches without full event aggregation */
export const DEMO_MATCH_STATS: Record<string, MatchStatRow[]> = {
  "match-1": [
    { label: "Shots", home: 7, away: 8, keeperTracked: true },
    { label: "Shots on target", home: 4, away: 5, keeperTracked: true },
    { label: "Saves", home: 3, away: 3, keeperTracked: true },
    { label: "Corners", home: 2, away: 0, keeperTracked: true },
    { label: "Fouls", home: 3, away: 3, keeperTracked: true },
    { label: "Offsides", home: 1, away: 2, keeperTracked: true },
    { label: "Yellow cards", home: 0, away: 1, keeperTracked: true },
    { label: "Red cards", home: 0, away: 0, keeperTracked: true },
  ],
  "match-15": [
    { label: "Shots", home: 14, away: 12, keeperTracked: true },
    { label: "Saves", home: 5, away: 6, keeperTracked: true },
    { label: "Corners", home: 6, away: 4, keeperTracked: true },
    { label: "Fouls", home: 11, away: 9, keeperTracked: true },
    { label: "Offsides", home: 2, away: 3, keeperTracked: true },
    { label: "Yellow cards", home: 2, away: 3, keeperTracked: true },
    { label: "Penalties (shootout)", home: 4, away: 3, keeperTracked: true },
  ],
};

function countGoals(list: DemoMatchEvent[]): number {
  let n = 0;
  for (const e of list) {
    if (e.period === "penalty_shootout") continue;
    if (e.event_type === "goal" || e.event_type === "penalty_scored") n += 1;
    // Own goals are credited to the opposing side in score — skip here per team filter.
  }
  return n;
}

export function getMatchStats(matchId: string, events: DemoMatchEvent[], homeTeamId: string): MatchStatRow[] {
  if (DEMO_MATCH_STATS[matchId]) return DEMO_MATCH_STATS[matchId];

  const live = events.filter(
    (e) =>
      e.event_type !== "stoppage_boarded" &&
      e.event_type !== "added_time" &&
      e.event_type !== "disallowed_goal" &&
      e.event_type !== "disallowed"
  );
  const home = live.filter((e) => e.team_id === homeTeamId);
  const away = live.filter((e) => e.team_id !== homeTeamId);

  const count = (list: DemoMatchEvent[], types: string[]) =>
    list.filter((e) => types.includes(e.event_type)).length;

  const homeGoals = countGoals(home) + away.filter((e) => e.event_type === "own_goal" && e.period !== "penalty_shootout").length;
  const awayGoals = countGoals(away) + home.filter((e) => e.event_type === "own_goal" && e.period !== "penalty_shootout").length;

  const homeSot = count(home, ["shot_on_target", "goal", "penalty_scored"]);
  const awaySot = count(away, ["shot_on_target", "goal", "penalty_scored"]);

  return [
    { label: "Goals", home: homeGoals, away: awayGoals, keeperTracked: true },
    { label: "Shots on target", home: homeSot, away: awaySot, keeperTracked: true },
    { label: "Saves", home: count(home, ["save"]), away: count(away, ["save"]), keeperTracked: true },
    { label: "Corners", home: count(home, ["corner"]), away: count(away, ["corner"]), keeperTracked: true },
    { label: "Fouls", home: count(home, ["foul"]), away: count(away, ["foul"]), keeperTracked: true },
    { label: "Offsides", home: count(home, ["offside"]), away: count(away, ["offside"]), keeperTracked: true },
    { label: "Yellow cards", home: count(home, ["yellow_card", "warning"]), away: count(away, ["yellow_card", "warning"]), keeperTracked: true },
    { label: "Red cards", home: count(home, ["red_card"]), away: count(away, ["red_card"]), keeperTracked: true },
  ];
}
