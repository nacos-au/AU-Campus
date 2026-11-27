import { fetchMatchesForHeadToHead } from "@/lib/data/repository";
import {
  summarizeHeadToHead,
  type HeadToHeadSummary,
} from "@/lib/match/head-to-head-summary";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

export type { HeadToHeadMeeting, HeadToHeadSummary } from "@/lib/match/head-to-head-summary";

const SUPPORTED_SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis"];

export function supportsHeadToHead(sport: SportId): boolean {
  return SUPPORTED_SPORTS.includes(sport);
}

function summarize(
  matches: Parameters<typeof summarizeHeadToHead>[0],
  teamAId: string,
  excludeMatchId?: string
): HeadToHeadSummary {
  return summarizeHeadToHead(matches, teamAId, excludeMatchId);
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
