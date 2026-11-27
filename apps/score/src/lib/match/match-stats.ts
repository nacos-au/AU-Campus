/**
 * Match stats shown on the public page. Only values a record keeper explicitly logged
 * (match_team_stats rows, written from the manual log page) are ever shown.
 * Nothing is derived from event counts, so old matches with no stats show no card.
 */

export interface MatchStatRow {
  label: string;
  /** Null when the side's value was not recorded. */
  home: number | null;
  away: number | null;
}

export interface TeamStatRecord {
  team_id: string;
  shots_on_target: number | null;
  saves: number | null;
  corners: number | null;
  fouls: number | null;
  offsides: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
}

export const STAT_FIELDS: ReadonlyArray<{ key: keyof Omit<TeamStatRecord, "team_id">; label: string }> = [
  { key: "shots_on_target", label: "Shots on target" },
  { key: "saves", label: "Saves" },
  { key: "corners", label: "Corners" },
  { key: "fouls", label: "Fouls" },
  { key: "offsides", label: "Offsides" },
  { key: "yellow_cards", label: "Yellow cards" },
  { key: "red_cards", label: "Red cards" },
];

/** Rows for fields that were recorded for at least one side. Empty when nothing was logged. */
export function explicitStatRows(
  records: TeamStatRecord[],
  homeTeamId: string,
  awayTeamId: string
): MatchStatRow[] {
  const home = records.find((r) => r.team_id === homeTeamId) ?? null;
  const away = records.find((r) => r.team_id === awayTeamId) ?? null;
  if (!home && !away) return [];

  return STAT_FIELDS.flatMap(({ key, label }) => {
    const h = home?.[key] ?? null;
    const a = away?.[key] ?? null;
    if (h == null && a == null) return [];
    return [{ label, home: h, away: a }];
  });
}
