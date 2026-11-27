import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  getSubmittedLineup,
  resolveLineupPlayers,
  setDemoSubmittedLineup,
  type SubmittedLineup,
  type SubmittedLineupEntry,
} from "@/lib/data/demo-lineups";
import { defaultLineupStatusForKickoff } from "@/lib/match/lineup-window";
import {
  completeStartingXi,
  DEFAULT_FORMATION,
  type PoolPlayer,
} from "@/lib/match/lineup-merge";
import type { LineupSheetStatus, Player } from "@/lib/types/database";

export type ResolvedLineupPlayer = Player & {
  is_starting: boolean;
  lineup_role?: string | null;
};

export type PublicMatchLineup = SubmittedLineup & {
  status: LineupSheetStatus;
  published_at: string | null;
  resolved: ResolvedLineupPlayer[];
  /** Formation used to draw the pitch. */
  formation?: string;
  /** True when the XI has the full number of starters (after completion from the squad). */
  complete?: boolean;
  /** Player ids the system filled into the XI because no full sheet was submitted. */
  auto_filled_ids?: string[];
};

type LineupRow = {
  match_id: string;
  team_id: string;
  players: SubmittedLineupEntry[];
  submitted_at: string;
  status?: string | null;
  published_at?: string | null;
  coach_name?: string | null;
  formation?: string | null;
};

type PoolEntry = {
  id: string;
  first_name: string;
  last_name: string;
  matric_number: string | null;
  avatar_url: string | null;
  position: string | null;
  jersey_number: number | null;
  is_captain: boolean;
  availability: "available" | "doubtful" | "injured" | "unavailable";
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
    coach_name: row.coach_name ?? null,
    formation: row.formation ?? undefined,
    resolved,
  };
}

/** Stored sheet exactly as submitted (no completion). Used by the staff editor and APIs. */
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
      formation: demo.formation ?? undefined,
      status: demo.status ?? "predicted",
      published_at: demo.published_at ?? demo.submitted_at,
      resolved,
    };
  }

  const supabase = await createClient();
  let data: LineupRow | null = null;
  const full = (await supabase
    .from("match_lineups")
    .select("match_id, team_id, players, submitted_at, status, published_at, coach_name, formation")
    .eq("match_id", matchId)
    .eq("team_id", teamId)
    .maybeSingle()) as { data: LineupRow | null; error: { message: string } | null };

  if (full.error?.message?.toLowerCase().includes("formation")) {
    const fallback = (await supabase
      .from("match_lineups")
      .select("match_id, team_id, players, submitted_at, status, published_at, coach_name")
      .eq("match_id", matchId)
      .eq("team_id", teamId)
      .maybeSingle()) as { data: LineupRow | null };
    data = fallback.data;
  } else {
    data = full.data;
  }

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

/** Squad pool for a side: competition roster when named, otherwise the club squad. */
async function loadSquadPool(
  tournamentId: string | null | undefined,
  teamId: string,
  sportId: string
): Promise<PoolEntry[]> {
  const { listCompetitionRoster } = await import("@/lib/data/competition-rosters");
  const { fetchSquadForTeam } = await import("@/lib/data/repository");

  let pool: PoolEntry[] = [];
  if (tournamentId) {
    const roster = await listCompetitionRoster(tournamentId, teamId);
    if (!("error" in roster) && roster.nominated.length > 0) {
      pool = roster.nominated.map((p) => ({
        id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        matric_number: p.matric_number,
        avatar_url: p.avatar_url,
        position: p.position,
        jersey_number: p.jersey_number,
        is_captain: p.is_captain === true,
        availability: p.availability ?? "available",
      }));
    }
  }

  if (!pool.length) {
    const squad = await fetchSquadForTeam(teamId, sportId);
    pool = squad.map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      matric_number: p.matric_number,
      avatar_url: p.avatar_url,
      position: p.position,
      jersey_number: p.jersey_number ?? null,
      is_captain: false,
      availability: "available",
    }));
  }

  return pool;
}

/**
 * The XI to show on the match page for one side.
 * A stored sheet with fewer starters than the sport needs (e.g. goalkeepers only, logged
 * from the manual page) is completed from the squad. The rest of the squad becomes the bench.
 * With no stored sheet, this is the predicted XI.
 */
export async function resolveDisplayLineup(input: {
  matchId: string;
  teamId: string;
  tournamentId: string | null | undefined;
  sportId: string;
  starters: number;
  sheet: PublicMatchLineup | null;
}): Promise<PublicMatchLineup | null> {
  const { matchId, teamId, tournamentId, sportId, starters, sheet } = input;
  const pool = await loadSquadPool(tournamentId, teamId, sportId);
  if (!sheet && pool.length === 0) return null;

  const { getTeamFormation } = await import("@/lib/data/competition-rosters");
  const formation =
    sheet?.formation ??
    (tournamentId ? await getTeamFormation(tournamentId, teamId) : null) ??
    DEFAULT_FORMATION;

  const poolForMerge: PoolPlayer[] = pool.map((p) => ({
    player_id: p.id,
    position: p.position,
    jersey_number: p.jersey_number,
    available: p.availability === "available",
  }));
  const completed = completeStartingXi({
    sheet: sheet?.players ?? [],
    pool: poolForMerge,
    starters,
    formation,
  });

  const poolById = new Map(pool.map((p) => [p.id, p]));
  const outsideEntries = completed.players.filter((e) => !poolById.has(e.player_id));
  const outsideResolved = await resolvePlayersFromIds(outsideEntries);
  const outsideById = new Map(outsideResolved.map((p) => [p.id, p]));

  const hasSquadCaptainStarter = completed.players.some(
    (e) => e.is_starting && e.is_captain
  );
  const squadCaptain = pool.find((p) => p.is_captain);
  const players = completed.players.map((e) => {
    const isSquadCaptain =
      !hasSquadCaptainStarter && squadCaptain && squadCaptain.id === e.player_id && e.is_starting;
    return {
      ...e,
      jersey_number: e.jersey_number ?? poolById.get(e.player_id)?.jersey_number ?? null,
      is_captain: e.is_captain || Boolean(isSquadCaptain),
    };
  });

  const resolved: ResolvedLineupPlayer[] = players.flatMap((e) => {
    const p = poolById.get(e.player_id);
    if (p) {
      return [
        {
          id: p.id,
          department_id: "",
          first_name: p.first_name,
          last_name: p.last_name,
          matric_number: p.matric_number,
          avatar_url: p.avatar_url,
          position: p.position,
          is_starting: e.is_starting,
          lineup_role: e.role ?? p.position,
        } as ResolvedLineupPlayer,
      ];
    }
    const outside = outsideById.get(e.player_id);
    return outside ? [{ ...outside, is_starting: e.is_starting }] : [];
  });

  const now = new Date().toISOString();
  const confirmed = sheet?.status === "confirmed" && completed.complete;
  return {
    match_id: matchId,
    team_id: teamId,
    players,
    submitted_at: sheet?.submitted_at ?? now,
    status: confirmed ? "confirmed" : "predicted",
    published_at: sheet?.published_at ?? now,
    coach_name: sheet?.coach_name ?? null,
    formation,
    complete: completed.complete,
    auto_filled_ids: completed.autoFilledIds,
    resolved,
  };
}

/** Predicted XI from the squad when no sheet exists. Kept for existing callers. */
export async function defaultLineupFromPool(
  matchId: string,
  teamId: string,
  tournamentId: string | null | undefined,
  sportId: string,
  starters = 11
): Promise<PublicMatchLineup | null> {
  return resolveDisplayLineup({
    matchId,
    teamId,
    tournamentId,
    sportId,
    starters,
    sheet: null,
  });
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
  coach_name?: string | null;
  formation?: string | null;
  min_starters?: number;
  require_bench?: boolean;
}): Promise<{ ok: true; status: LineupSheetStatus } | { error: string }> {
  const scheduledAt = await readMatchKickoff(input.match_id);
  const status = defaultLineupStatusForKickoff(scheduledAt, input.status);

  const starters = input.players.filter((p) => p.is_starting);
  const bench = input.players.filter((p) => !p.is_starting);
  const minStarters = input.min_starters ?? 11;
  if (starters.length < minStarters) {
    return { error: `Name at least ${minStarters} starters (got ${starters.length}).` };
  }
  if (input.require_bench !== false && bench.length < 1) {
    return { error: "Name at least one substitute on the bench." };
  }
  const captains = starters.filter((p) => p.is_captain);
  if (captains.length > 1) {
    return { error: "Only one captain can be named among the starters." };
  }

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const now = new Date().toISOString();
    setDemoSubmittedLineup({
      match_id: input.match_id,
      team_id: input.team_id,
      players: input.players,
      submitted_at: now,
      status,
      published_at: now,
      coach_name: input.coach_name?.trim() || null,
      formation: input.formation?.trim() || null,
    });
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
      coach_name: input.coach_name?.trim() || null,
      formation: input.formation?.trim() || null,
    } as Record<string, unknown>,
    { onConflict: "match_id,team_id" }
  )) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true, status };
}
