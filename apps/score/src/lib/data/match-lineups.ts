import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  getSubmittedLineup,
  type SubmittedLineup,
  type SubmittedLineupEntry,
} from "@/lib/data/demo-lineups";

export async function fetchMatchLineup(
  matchId: string,
  teamId: string
): Promise<SubmittedLineup | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return getSubmittedLineup(matchId, teamId);
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("match_lineups")
    .select("match_id, team_id, players, submitted_at")
    .eq("match_id", matchId)
    .eq("team_id", teamId)
    .maybeSingle()) as {
    data: {
      match_id: string;
      team_id: string;
      players: SubmittedLineupEntry[];
      submitted_at: string;
    } | null;
  };

  if (!data) return null;
  return {
    match_id: data.match_id,
    team_id: data.team_id,
    players: data.players ?? [],
    submitted_at: data.submitted_at,
  };
}

export async function submitMatchLineup(input: {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
}): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    // Demo lineup store is seed-only; accept without persistence.
    return { ok: true };
  }

  const supabase = await createClient();

  // Suspension gate — active suspensions block naming.
  const playerIds = input.players.map((p) => p.player_id);
  if (playerIds.length) {
    const { data: active } = (await supabase
      .from("player_suspensions")
      .select("player_id")
      .in("player_id", playerIds)
      .eq("is_active", true)) as {
      data: Array<{ player_id: string }> | null;
    };
    if (active?.length) {
      return {
        error: `Suspended player(s) cannot be named on this sheet (${active.length}).`,
      };
    }
  }

  const { error } = (await (supabase.from("match_lineups") as ReturnType<typeof supabase.from>).upsert(
    {
      match_id: input.match_id,
      team_id: input.team_id,
      players: input.players,
      submitted_at: new Date().toISOString(),
    } as Record<string, unknown>,
    { onConflict: "match_id,team_id" }
  )) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}
