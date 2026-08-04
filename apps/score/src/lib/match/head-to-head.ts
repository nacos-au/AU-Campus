import { fetchMatchesForHeadToHead } from "@/lib/data/repository";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

export interface HeadToHeadMeeting {
  match_id: string;
  scheduled_at: string;
  tournament_name: string;
  home_team_name: string;
  home_logo_url: string | null;
  away_team_name: string;
  away_logo_url: string | null;
  home_score: number;
  away_score: number;
  /** Result from the perspective of the first team passed to getHeadToHead. */
  result: "win" | "draw" | "loss";
}

export interface HeadToHeadSummary {
  meetings: HeadToHeadMeeting[];
  wins: number;
  draws: number;
  losses: number;
}

const SUPPORTED_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis"];

export function supportsHeadToHead(sport: SportId): boolean {
  return SUPPORTED_SPORTS.includes(sport);
}

function summarize(
  matches: Awaited<ReturnType<typeof fetchMatchesForHeadToHead>>,
  teamAId: string,
  excludeMatchId?: string
): HeadToHeadSummary {
  const meetings: HeadToHeadMeeting[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;

  for (const m of matches) {
    if (m.id === excludeMatchId) continue;

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
      home_logo_url: m.home_team?.logo_url ?? null,
      away_team_name: m.away_team?.name ?? "Away",
      away_logo_url: m.away_team?.logo_url ?? null,
      home_score: m.home_score,
      away_score: m.away_score,
      result,
    });
  }

  meetings.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return { meetings, wins, draws, losses };
}

/** Sync helper for client components — uses demo/session overlay. */
export function getHeadToHead(
  sport: SportId,
  teamAId: string,
  teamBId: string,
  excludeMatchId?: string
): HeadToHeadSummary {
  const sportDbId = sportToDbId(sport);
  const matches = listAllDemoMatches().filter(
    (m) =>
      m.sport_id === sportDbId &&
      m.status === "completed" &&
      !m.deleted_at &&
      [m.home_team_id, m.away_team_id].includes(teamAId) &&
      [m.home_team_id, m.away_team_id].includes(teamBId)
  );
  return summarize(matches, teamAId, excludeMatchId);
}

/** Async production path — prefers Supabase when configured. */
export async function getHeadToHeadAsync(
  sport: SportId,
  teamAId: string,
  teamBId: string,
  excludeMatchId?: string
): Promise<HeadToHeadSummary> {
  const matches = await fetchMatchesForHeadToHead(sportToDbId(sport), teamAId, teamBId);
  return summarize(matches, teamAId, excludeMatchId);
}
