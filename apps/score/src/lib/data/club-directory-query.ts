import type { Team } from "@/lib/types/database";
import { resolveSportUuid, type Supabase } from "@/lib/data/sport-ids";

/**
 * Clubs for the public directory: every active team in the sport, or only the
 * teams registered in one competition. Guest sides are included.
 */
export async function queryClubDirectory(
  supabase: Supabase,
  sportDbId: string,
  tournamentId?: string | null
): Promise<Team[]> {
  const sportUuid = await resolveSportUuid(supabase, sportDbId);
  if (typeof sportUuid !== "string") {
    console.error("[clubs] sport lookup failed:", sportUuid.error);
    return [];
  }

  let teamIds: string[] | null = null;
  if (tournamentId) {
    const { data: regs, error: regError } = (await supabase
      .from("tournament_teams")
      .select("team_id")
      .eq("tournament_id", tournamentId)) as {
      data: Array<{ team_id: string }> | null;
      error: { message: string } | null;
    };
    if (regError) {
      console.error("[clubs] competition teams read failed:", regError.message);
      return [];
    }
    teamIds = (regs ?? []).map((r) => r.team_id);
    if (!teamIds.length) return [];
  }

  let query = supabase
    .from("teams")
    .select("*, department:departments(id, name, short_code)")
    .eq("sport_id", sportUuid)
    .is("deleted_at", null);
  if (teamIds) query = query.in("id", teamIds);

  const { data, error } = (await query.order("name")) as {
    data: Team[] | null;
    error: { message: string } | null;
  };
  if (error) {
    console.error("[clubs] teams read failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** Crest letters: department code for AU sides, initials for guests. */
export function clubCrestCode(team: Pick<Team, "name" | "department">): string {
  const code = team.department?.short_code?.trim();
  if (code) return code;
  const initials = team.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return initials || "AU";
}
