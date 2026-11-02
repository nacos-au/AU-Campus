import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  addDemoTournamentRoster,
  getCreatedDemoTournament,
  listCreatedDemoTournaments,
  listDemoTournamentRosters,
  removeDemoTournamentRoster,
} from "@/lib/data/demo-competitions-store";
import { findDemoTeam, listDemoRosterPlayers } from "@/lib/data/demo-roster";
import { getTournamentsForSport } from "@/lib/data/demo-competition";
import { listAllDemoMatches } from "@/lib/data/demo-match-store";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import type { Player, Tournament } from "@/lib/types/database";

export type CompetitionListItem = {
  id: string;
  name: string;
  sport_id: string;
  season: string;
  competition_type: "league" | "cup" | "event" | null;
  max_squad_size: number;
  max_subs: number;
  team_count: number;
  roster_count: number;
  config: Record<string, unknown>;
};

export type CompetitionTeamRow = {
  team_id: string;
  team_name: string;
  seed: number | null;
  roster_count: number;
  roster_locked: boolean;
};

export type CompetitionRosterPlayer = {
  id: string;
  player_id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  matric_number: string | null;
  position: string | null;
  jersey_number: number | null;
  avatar_url: string | null;
};

function maxSquadFromConfig(config: Record<string, unknown> | null | undefined): number {
  const n = Number(config?.max_squad_size);
  return Number.isFinite(n) && n > 0 ? n : 25;
}

function maxSubsFromConfig(config: Record<string, unknown> | null | undefined): number {
  const n = Number(config?.max_subs);
  return Number.isFinite(n) && n >= 0 ? n : 9;
}

async function inDemo(): Promise<boolean> {
  return !hasSupabaseConfig() || (await getScoreDemoMode());
}

export async function listCompetitions(sportDbId?: string): Promise<CompetitionListItem[]> {
  if (await inDemo()) {
    const created = listCreatedDemoTournaments(sportDbId);
    const seeded = sportDbId
      ? getTournamentsForSport(sportDbId)
      : (
          [
            "sport-football",
            "sport-basketball",
            "sport-volleyball",
            "sport-tennis",
            "sport-track",
          ] as const
        ).flatMap((s) => getTournamentsForSport(s));
    const byId = new Map<string, Tournament>();
    for (const t of seeded) byId.set(t.id, t);
    for (const t of created) byId.set(t.id, t);

    return [...byId.values()].map((t) => {
      const meta = getCreatedDemoTournament(t.id);
      const config = meta?.config ?? {};
      const teamCount = meta?.team_ids.length ?? 0;
      const rosterCount = listDemoTournamentRosters(t.id).length;
      return {
        id: t.id,
        name: t.name,
        sport_id: t.sport_id,
        season: t.season,
        competition_type: t.competition_type ?? null,
        max_squad_size: maxSquadFromConfig(config),
        max_subs: maxSubsFromConfig(config),
        team_count: teamCount,
        roster_count: rosterCount,
        config,
      };
    });
  }

  const supabase = await createClient();
  let q = supabase
    .from("tournaments")
    .select("id, name, sport_id, season, competition_type, config")
    .order("created_at", { ascending: false });
  if (sportDbId) {
    const sportUuid = await resolveSportUuid(supabase, sportDbId);
    if (typeof sportUuid === "string") q = q.eq("sport_id", sportUuid);
    else return [];
  }

  const { data: rows, error } = (await q) as {
    data: Array<{
      id: string;
      name: string;
      sport_id: string;
      season: string;
      competition_type: "league" | "cup" | "event" | null;
      config: Record<string, unknown> | null;
    }> | null;
    error: { message: string } | null;
  };
  if (error || !rows?.length) return [];

  const ids = rows.map((r) => r.id);
  const { data: teamRows } = (await supabase
    .from("tournament_teams")
    .select("tournament_id")
    .in("tournament_id", ids)) as { data: Array<{ tournament_id: string }> | null };
  const { data: rosterRows } = (await supabase
    .from("tournament_rosters")
    .select("tournament_id")
    .in("tournament_id", ids)) as { data: Array<{ tournament_id: string }> | null };

  const teamCount = new Map<string, number>();
  for (const r of teamRows ?? []) {
    teamCount.set(r.tournament_id, (teamCount.get(r.tournament_id) ?? 0) + 1);
  }
  const rosterCount = new Map<string, number>();
  for (const r of rosterRows ?? []) {
    rosterCount.set(r.tournament_id, (rosterCount.get(r.tournament_id) ?? 0) + 1);
  }

  return rows.map((r) => {
    const config = r.config ?? {};
    return {
      id: r.id,
      name: r.name,
      sport_id: r.sport_id,
      season: r.season,
      competition_type: r.competition_type,
      max_squad_size: maxSquadFromConfig(config),
      max_subs: maxSubsFromConfig(config),
      team_count: teamCount.get(r.id) ?? 0,
      roster_count: rosterCount.get(r.id) ?? 0,
      config,
    };
  });
}

export async function getCompetitionDetail(tournamentId: string): Promise<{
  competition: CompetitionListItem;
  teams: CompetitionTeamRow[];
} | { error: string }> {
  if (await inDemo()) {
    const meta = getCreatedDemoTournament(tournamentId);
    if (!meta) return { error: "Competition not found" };
    const rosterAll = listDemoTournamentRosters(tournamentId);
    const teams: CompetitionTeamRow[] = meta.team_ids.map((teamId, i) => {
      const team = findDemoTeam(teamId);
      return {
        team_id: teamId,
        team_name: team?.name ?? "Unknown",
        seed: i + 1,
        roster_count: rosterAll.filter((r) => r.team_id === teamId).length,
        roster_locked: false,
      };
    });
    return {
      competition: {
        id: meta.id,
        name: meta.name,
        sport_id: meta.sport_id,
        season: meta.season,
        competition_type: meta.competition_type ?? null,
        max_squad_size: maxSquadFromConfig(meta.config),
        max_subs: maxSubsFromConfig(meta.config),
        team_count: teams.length,
        roster_count: rosterAll.length,
        config: meta.config,
      },
      teams,
    };
  }

  const supabase = await createClient();
  const { data: t, error } = (await supabase
    .from("tournaments")
    .select("id, name, sport_id, season, competition_type, config")
    .eq("id", tournamentId)
    .maybeSingle()) as {
    data: {
      id: string;
      name: string;
      sport_id: string;
      season: string;
      competition_type: "league" | "cup" | "event" | null;
      config: Record<string, unknown> | null;
    } | null;
    error: { message: string } | null;
  };
  if (error) return { error: error.message };
  if (!t) return { error: "Competition not found" };

  const { data: tt } = (await supabase
    .from("tournament_teams")
    .select("team_id, seed, roster_locked_at")
    .eq("tournament_id", tournamentId)
    .order("seed", { ascending: true })) as {
    data: Array<{ team_id: string; seed: number | null; roster_locked_at: string | null }> | null;
  };

  const teamIds = (tt ?? []).map((r) => r.team_id);
  const { data: teamRows } = teamIds.length
    ? ((await supabase.from("teams").select("id, name").in("id", teamIds)) as {
        data: Array<{ id: string; name: string }> | null;
      })
    : { data: [] as Array<{ id: string; name: string }> };

  const nameById = new Map((teamRows ?? []).map((x) => [x.id, x.name]));

  const { data: rosterRows } = (await supabase
    .from("tournament_rosters")
    .select("team_id")
    .eq("tournament_id", tournamentId)) as { data: Array<{ team_id: string }> | null };
  const countByTeam = new Map<string, number>();
  for (const r of rosterRows ?? []) {
    countByTeam.set(r.team_id, (countByTeam.get(r.team_id) ?? 0) + 1);
  }

  const config = t.config ?? {};
  const teams: CompetitionTeamRow[] = (tt ?? []).map((r) => ({
    team_id: r.team_id,
    team_name: nameById.get(r.team_id) ?? "Unknown",
    seed: r.seed,
    roster_count: countByTeam.get(r.team_id) ?? 0,
    roster_locked: Boolean(r.roster_locked_at),
  }));

  return {
    competition: {
      id: t.id,
      name: t.name,
      sport_id: t.sport_id,
      season: t.season,
      competition_type: t.competition_type,
      max_squad_size: maxSquadFromConfig(config),
      max_subs: maxSubsFromConfig(config),
      team_count: teams.length,
      roster_count: [...countByTeam.values()].reduce((a, b) => a + b, 0),
      config,
    },
    teams,
  };
}

export async function listCompetitionRoster(
  tournamentId: string,
  teamId: string
): Promise<{
  nominated: CompetitionRosterPlayer[];
  pool: CompetitionRosterPlayer[];
  max_squad_size: number;
} | { error: string }> {
  const detail = await getCompetitionDetail(tournamentId);
  if ("error" in detail) return detail;
  const team = detail.teams.find((t) => t.team_id === teamId);
  if (!team) return { error: "Team is not in this competition" };
  const max = detail.competition.max_squad_size;

  if (await inDemo()) {
    const nominatedRows = listDemoTournamentRosters(tournamentId, teamId);
    const clubPool = listDemoRosterPlayers(detail.competition.sport_id, teamId);
    const nominatedIds = new Set(nominatedRows.map((r) => r.player_id));
    const nominated: CompetitionRosterPlayer[] = nominatedRows.flatMap((r) => {
      const p = clubPool.find((c) => c.id === r.player_id);
      if (!p) return [];
      return [
        {
          id: r.id,
          player_id: r.player_id,
          team_id: teamId,
          first_name: p.first_name,
          last_name: p.last_name,
          matric_number: p.matric_number,
          position: p.position,
          jersey_number: r.jersey_number ?? p.jersey_number,
          avatar_url: p.avatar_url,
        },
      ];
    });
    const pool: CompetitionRosterPlayer[] = clubPool
      .filter((p) => !nominatedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        player_id: p.id,
        team_id: teamId,
        first_name: p.first_name,
        last_name: p.last_name,
        matric_number: p.matric_number,
        position: p.position,
        jersey_number: p.jersey_number,
        avatar_url: p.avatar_url,
      }));
    return { nominated, pool, max_squad_size: max };
  }

  const supabase = await createClient();
  const { data: nominatedRegs } = (await supabase
    .from("tournament_rosters")
    .select("id, player_id, team_id, jersey_number")
    .eq("tournament_id", tournamentId)
    .eq("team_id", teamId)) as {
    data: Array<{
      id: string;
      player_id: string;
      team_id: string;
      jersey_number: number | null;
    }> | null;
  };

  const { data: clubRegs } = (await supabase
    .from("player_sport_registry")
    .select("player_id, jersey_number, squad_role")
    .eq("team_id", teamId)
    .eq("is_active", true)) as {
    data: Array<{ player_id: string; jersey_number: number | null; squad_role: string | null }> | null;
  };

  const allPlayerIds = [
    ...new Set([
      ...(nominatedRegs ?? []).map((r) => r.player_id),
      ...(clubRegs ?? []).map((r) => r.player_id),
    ]),
  ];
  const { data: players } = allPlayerIds.length
    ? ((await supabase
        .from("players")
        .select("id, first_name, last_name, matric_number, position, avatar_url")
        .in("id", allPlayerIds)) as {
        data: Array<
          Pick<Player, "id" | "first_name" | "last_name" | "matric_number" | "position" | "avatar_url">
        > | null;
      })
    : { data: [] as Array<Pick<Player, "id" | "first_name" | "last_name" | "matric_number" | "position" | "avatar_url">> };

  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const nominatedIds = new Set((nominatedRegs ?? []).map((r) => r.player_id));

  const nominated: CompetitionRosterPlayer[] = (nominatedRegs ?? []).flatMap((r) => {
    const p = byId.get(r.player_id);
    if (!p) return [];
    return [
      {
        id: r.id,
        player_id: r.player_id,
        team_id: teamId,
        first_name: p.first_name,
        last_name: p.last_name,
        matric_number: p.matric_number,
        position: p.position,
        jersey_number: r.jersey_number,
        avatar_url: p.avatar_url,
      },
    ];
  });

  const pool: CompetitionRosterPlayer[] = (clubRegs ?? [])
    .filter((r) => !nominatedIds.has(r.player_id))
    .flatMap((r) => {
      const p = byId.get(r.player_id);
      if (!p) return [];
      return [
        {
          id: p.id,
          player_id: p.id,
          team_id: teamId,
          first_name: p.first_name,
          last_name: p.last_name,
          matric_number: p.matric_number,
          position: p.position ?? r.squad_role,
          jersey_number: r.jersey_number,
          avatar_url: p.avatar_url,
        },
      ];
    });

  nominated.sort((a, b) => a.last_name.localeCompare(b.last_name));
  pool.sort((a, b) => a.last_name.localeCompare(b.last_name));
  return { nominated, pool, max_squad_size: max };
}

export async function addToCompetitionRoster(input: {
  tournament_id: string;
  team_id: string;
  player_id: string;
  jersey_number?: number | null;
}): Promise<{ ok: true } | { error: string }> {
  const detail = await getCompetitionDetail(input.tournament_id);
  if ("error" in detail) return detail;
  const team = detail.teams.find((t) => t.team_id === input.team_id);
  if (!team) return { error: "Team is not in this competition" };
  if (team.roster_locked) return { error: "This competition squad is locked" };
  if (team.roster_count >= detail.competition.max_squad_size) {
    return {
      error: `Squad full (${detail.competition.max_squad_size}). Remove a player or raise the competition max.`,
    };
  }

  if (await inDemo()) {
    const pool = listDemoRosterPlayers(detail.competition.sport_id, input.team_id);
    if (!pool.some((p) => p.id === input.player_id)) {
      return { error: "Player is not in this club’s pool" };
    }
    const result = addDemoTournamentRoster(input);
    if ("error" in result) return result;
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: inClub } = (await supabase
    .from("player_sport_registry")
    .select("player_id, jersey_number")
    .eq("team_id", input.team_id)
    .eq("player_id", input.player_id)
    .eq("is_active", true)
    .maybeSingle()) as {
    data: { player_id: string; jersey_number: number | null } | null;
  };
  if (!inClub) return { error: "Player is not in this club’s pool" };

  const { error } = (await (supabase.from("tournament_rosters") as ReturnType<typeof supabase.from>).insert({
    tournament_id: input.tournament_id,
    team_id: input.team_id,
    player_id: input.player_id,
    jersey_number: input.jersey_number ?? inClub.jersey_number,
  } as Record<string, unknown>)) as { error: { message: string } | null };

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Player is already on this competition" };
    }
    return { error: error.message };
  }
  return { ok: true };
}

export type CompetitionFixtureRow = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
  scheduled_at: string;
  venue_name: string | null;
  status: string;
};

export async function listCompetitionFixtures(
  tournamentId: string
): Promise<CompetitionFixtureRow[]> {
  if (await inDemo()) {
    return listAllDemoMatches()
      .filter((m) => m.tournament_id === tournamentId && !m.deleted_at)
      .map((m) => ({
        id: m.id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_team_name: m.home_team?.name ?? "Home",
        away_team_name: m.away_team?.name ?? "Away",
        scheduled_at: m.scheduled_at,
        venue_name: m.venue?.name ?? null,
        status: m.status,
      }))
      .sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("matches")
    .select(
      "id, home_team_id, away_team_id, scheduled_at, status, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name), venue:venues(name)"
    )
    .eq("tournament_id", tournamentId)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true })) as {
    data: Array<{
      id: string;
      home_team_id: string | null;
      away_team_id: string | null;
      scheduled_at: string;
      status: string;
      home_team: { name: string } | null;
      away_team: { name: string } | null;
      venue: { name: string } | null;
    }> | null;
  };

  return (data ?? []).map((m) => ({
    id: m.id,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    home_team_name: m.home_team?.name ?? "Home",
    away_team_name: m.away_team?.name ?? "Away",
    scheduled_at: m.scheduled_at,
    venue_name: m.venue?.name ?? null,
    status: m.status,
  }));
}

export async function removeFromCompetitionRoster(
  tournamentId: string,
  playerId: string
): Promise<{ ok: true } | { error: string }> {
  if (await inDemo()) {
    if (!removeDemoTournamentRoster(tournamentId, playerId)) {
      return { error: "Player not on this competition squad" };
    }
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = (await supabase
    .from("tournament_rosters")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return { ok: true };
}
