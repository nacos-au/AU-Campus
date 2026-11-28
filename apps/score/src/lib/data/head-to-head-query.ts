import type { Match } from "@/lib/types/database";
import { resolveSportUuid, type Supabase } from "@/lib/data/sport-ids";

/**
 * Completed meetings between two teams for one sport, newest first.
 * Takes the Supabase client as an argument so it can be tested without a server.
 */
export async function queryHeadToHeadMatches(
  supabase: Supabase,
  sportDbId: string,
  teamAId: string,
  teamBId: string
): Promise<Match[]> {
  // `matches.sport_id` is a UUID; the caller passes a slug like "sport-football".
  const sportUuid = await resolveSportUuid(supabase, sportDbId);
  if (typeof sportUuid !== "string") {
    console.error("[head-to-head] sport lookup failed:", sportUuid.error);
    return [];
  }

  const { data, error } = await supabase
    .from("matches")
    .select(
      "*, home_team:teams!home_team_id(*, department:departments(short_code)), away_team:teams!away_team_id(*, department:departments(short_code)), tournament:tournaments(*)"
    )
    .eq("sport_id", sportUuid)
    .eq("status", "completed")
    .is("deleted_at", null)
    .or(
      `and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`
    )
    .order("scheduled_at", { ascending: false }) as { data: Match[] | null; error: { message: string } | null };

  if (error) {
    console.error("[head-to-head] matches read failed:", error.message);
    return [];
  }
  return (data ?? []) as Match[];
}
