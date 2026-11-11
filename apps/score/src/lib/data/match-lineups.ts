import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  getSubmittedLineup,
  resolveLineupPlayers,
  type SubmittedLineup,
  type SubmittedLineupEntry,
} from "@/lib/data/demo-lineups";
import { defaultLineupStatusForKickoff } from "@/lib/match/lineup-window";
import type { LineupSheetStatus, Player } from "@/lib/types/database";

export type ResolvedLineupPlayer = Player & {
  is_starting: boolean;
  lineup_role?: string | null;
};

export type PublicMatchLineup = SubmittedLineup & {
  status: LineupSheetStatus;
  published_at: string | null;
  resolved: ResolvedLineupPlayer[];
};

type LineupRow = {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
  submitted_at: string;
  status?: string | null;
  published_at?: string | null;
};

function normalizeStatus(raw: string | null | undefined): LineupSheetStatus {
  return raw === "confirmed" ? "confirmed" : "predicted";
}

async function resolvePlayersFromIds(
  entries: SubmittedLineupEntry[]
): Promise<ResolvedLineupPlayer[]> {
  if (!entries.length) return [];

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return resolveLineupPlayers({
      match_id: "",
      team_id: "",
      players: entries,
      submitted_at: new Date().toISOString(),
    });
  }

  const supabase = await createClient();
  const ids = entries.map((e) => e.player_id);
  const { data } = (await supabase
    .from("players")
    .select("id, department_id, first_name, last_name, matric_number, avatar_url, position")
    .in("id", ids)) as {
    data: Player[] | null;
  };

  const byId = new Map((data ?? []).map((p) => [p.id, p]));
  return entries.flatMap((entry) => {
    const player = byId.get(entry.player_id);
    if (!player) return [];
    return [
      {
        ...player,
        is_starting: entry.is_starting,
        lineup_role: entry.role ?? player.position,
      },
    ];
  });
}

function toPublicLineup(row: LineupRow, resolved: ResolvedLineupPlayer[]): PublicMatchLineup {
  return {
    match_id: row.match_id,
    team_id: row.team_id,
    players: row.players ?? [],
    submitted_at: row.submitted_at,
    status: normalizeStatus(row.status),
    published_at: row.published_at ?? row.submitted_at ?? null,
    resolved,
  };
}

export async function fetchMatchLineup(
  matchId: string,
  teamId: string
): Promise<PublicMatchLineup | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const demo = getSubmittedLineup(matchId, teamId);
    if (!demo) return null;
    const resolved = resolveLineupPlayers(demo);
    return {
      ...demo,
      status: demo.status ?? "predicted",
      published_at: demo.published_at ?? demo.submitted_at,
      resolved,
    };
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("match_lineups")
    .select("match_id, team_id, players, submitted_at, status, published_at")
    .eq("match_id", matchId)
    .eq("team_id", teamId)
    .maybeSingle()) as { data: LineupRow | null };

  if (!data) return null;
  const resolved = await resolvePlayersFromIds(data.players ?? []);
  return toPublicLineup(data, resolved);
}

export async function fetchMatchLineupsBothSides(
  matchId: string,
  homeTeamId: string | null | undefined,
  awayTeamId: string | null | undefined
): Promise<{ home: PublicMatchLineup | null; away: PublicMatchLineup | null }> {
  const [home, away] = await Promise.all([
    homeTeamId ? fetchMatchLineup(matchId, homeTeamId) : Promise.resolve(null),
    awayTeamId ? fetchMatchLineup(matchId, awayTeamId) : Promise.resolve(null),
  ]);
  return { home, away };
}

async function readMatchKickoff(matchId: string): Promise<string | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return null;
  }
  const supabase = await createClient();
  const { data } = (await supabase
    .from("matches")
    .select("scheduled_at")
    .eq("id", matchId)
    .maybeSingle()) as { data: { scheduled_at: string } | null };
  return data?.scheduled_at ?? null;
}

export async function submitMatchLineup(input: {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
  status?: LineupSheetStatus | null;
}): Promise<{ ok: true; status: LineupSheetStatus } | { error: string }> {
  const scheduledAt = await readMatchKickoff(input.match_id);
  const status = defaultLineupStatusForKickoff(scheduledAt, input.status);

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { ok: true, status };
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

  const now = new Date().toISOString();
  const { error } = (await (supabase.from("match_lineups") as ReturnType<typeof supabase.from>).upsert(
    {
      match_id: input.match_id,
      team_id: input.team_id,
      players: input.players,
      submitted_at: now,
      status,
      published_at: now,
    } as Record<string, unknown>,
    { onConflict: "match_id,team_id" }
  )) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true, status };
}
