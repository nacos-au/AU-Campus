/**
 * Pure head-to-head summary (no server imports) so it can be unit tested.
 */

export interface HeadToHeadMeeting {
  match_id: string;
  scheduled_at: string;
  tournament_name: string;
  home_team_name: string;
  home_code: string;
  home_logo_url: string | null;
  away_team_name: string;
  away_code: string;
  away_logo_url: string | null;
  home_score: number;
  away_score: number;
  /** Result from the perspective of the first team passed to the summary (team A). */
  result: "win" | "draw" | "loss";
}

export interface HeadToHeadSummary {
  meetings: HeadToHeadMeeting[];
  wins: number;
  draws: number;
  losses: number;
}

export interface HeadToHeadMatchRow {
  id: string;
  scheduled_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number;
  away_score: number;
  deleted_at?: string | null;
  tournament?: { name?: string | null } | null;
  home_team?: {
    name?: string | null;
    logo_url?: string | null;
    department?: { short_code?: string | null } | null;
  } | null;
  away_team?: {
    name?: string | null;
    logo_url?: string | null;
    department?: { short_code?: string | null } | null;
  } | null;
}

/** Team A's perspective: wins/losses/draws across completed meetings, newest first. */
export function summarizeHeadToHead(
  matches: HeadToHeadMatchRow[],
  teamAId: string,
  excludeMatchId?: string
): HeadToHeadSummary {
  const meetings: HeadToHeadMeeting[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const m of matches) {
    if (m.id === excludeMatchId) continue;
    if (m.deleted_at) continue;

    const aIsHome = m.home_team_id === teamAId;
    const aScore = aIsHome ? m.home_score : m.away_score;
    const bScore = aIsHome ? m.away_score : m.home_score;
    const result: HeadToHeadMeeting["result"] =
      aScore > bScore ? "win" : aScore < bScore ? "loss" : "draw";

    if (result === "win") wins++;
    else if (result === "loss") losses++;
    else draws++;

    meetings.push({
      match_id: m.id,
      scheduled_at: m.scheduled_at,
      tournament_name: m.tournament?.name ?? "",
      home_team_name: m.home_team?.name ?? "Home",
      home_code: m.home_team?.department?.short_code ?? "",
      home_logo_url: m.home_team?.logo_url ?? null,
      away_team_name: m.away_team?.name ?? "Away",
      away_code: m.away_team?.department?.short_code ?? "",
      away_logo_url: m.away_team?.logo_url ?? null,
      home_score: m.home_score,
      away_score: m.away_score,
      result,
    });
  }

  meetings.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return { meetings, wins, draws, losses };
}
