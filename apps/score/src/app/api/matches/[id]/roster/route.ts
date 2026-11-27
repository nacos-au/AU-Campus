import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { listCompetitionRoster } from "@/lib/data/competition-rosters";
import { fetchMatchLineup } from "@/lib/data/match-lineups";
import { fetchMatchById, fetchSquadForTeam } from "@/lib/data/repository";
import type { SquadPlayer } from "@/lib/data/demo-squads";

type Ctx = { params: Promise<{ id: string }> };

function sortByJersey<T extends { jersey_number?: number | null; last_name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ja = a.jersey_number ?? 999;
    const jb = b.jersey_number ?? 999;
    if (ja !== jb) return ja - jb;
    return a.last_name.localeCompare(b.last_name);
  });
}

/**
 * Full match-day pool for one side: the competition squad when one exists,
 * otherwise the club squad. Keepers pick subs from this during the match.
 */
async function sidePool(
  tournamentId: string | null | undefined,
  teamId: string,
  sportId: string
): Promise<{ players: SquadPlayer[]; requireNamedBench: boolean; maxSubs: number | null }> {
  if (tournamentId) {
    const roster = await listCompetitionRoster(tournamentId, teamId);
    if (!("error" in roster) && roster.nominated.length > 0) {
      const players = roster.nominated.map(
        (p) =>
          ({
            id: p.player_id,
            department_id: "",
            first_name: p.first_name,
            last_name: p.last_name,
            nickname: p.nickname,
            matric_number: p.matric_number,
            avatar_url: p.avatar_url,
            position: p.position,
            jersey_number: p.jersey_number ?? undefined,
            squad_role: "Squad",
            availability: p.availability,
          }) satisfies SquadPlayer & { availability: string }
      );
      return {
        players: sortByJersey(players),
        requireNamedBench: roster.require_named_bench,
        maxSubs: roster.max_subs,
      };
    }
  }
  const squad = await fetchSquadForTeam(teamId, sportId);
  return { players: sortByJersey(squad), requireNamedBench: false, maxSubs: null };
}

async function sideRoster(
  matchId: string,
  tournamentId: string | null | undefined,
  teamId: string,
  sportId: string
): Promise<{ players: SquadPlayer[]; maxSubs: number | null }> {
  if (!teamId) return { players: [], maxSubs: null };

  const pool = await sidePool(tournamentId, teamId, sportId);
  const byId = new Map(pool.players.map((p) => [p.id, p]));
  const lineup = await fetchMatchLineup(matchId, teamId);

  if (lineup?.players?.length) {
    // Squad rows missing from the pool (e.g. club-only players) still need names.
    if (lineup.players.some((e) => !byId.has(e.player_id))) {
      const club = await fetchSquadForTeam(teamId, sportId);
      for (const p of club) if (!byId.has(p.id)) byId.set(p.id, p);
    }
    const startersIds = new Set(
      lineup.players.filter((e) => e.is_starting).map((e) => e.player_id)
    );
    const sheetBench = new Set(
      lineup.players.filter((e) => !e.is_starting).map((e) => e.player_id)
    );

    const xi = lineup.players.flatMap((entry) => {
      if (!entry.is_starting) return [];
      const p = byId.get(entry.player_id);
      return p ? [{ ...p, squad_role: "Starting" }] : [];
    });

    // Named bench first, then (unless a named bench is required) the rest of the squad.
    const bench: SquadPlayer[] = [];
    for (const id of sheetBench) {
      const p = byId.get(id);
      if (p) bench.push({ ...p, squad_role: "Substitute" });
    }
    if (!pool.requireNamedBench) {
      for (const p of pool.players) {
        if (startersIds.has(p.id) || sheetBench.has(p.id)) continue;
        const availability = (p as SquadPlayer & { availability?: string }).availability;
        if (availability && availability !== "available") continue;
        bench.push({ ...p, squad_role: "Substitute" });
      }
    }
    return { players: [...xi, ...sortByJersey(bench)], maxSubs: pool.maxSubs };
  }

  return {
    players: pool.players.map((p, i) => ({
      ...p,
      squad_role:
        p.squad_role && /start|bench|sub|xi/i.test(p.squad_role)
          ? p.squad_role
          : i < 11
            ? "Starting XI"
            : "Bench",
    })),
    maxSubs: pool.maxSubs,
  };
}

/** Keeper match-day squad: XI from lineup, bench from the rest of the competition squad. */
export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const match = await fetchMatchById(id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const home = await sideRoster(
    id,
    match.tournament_id,
    match.home_team_id ?? "",
    match.sport_id
  );
  const away = await sideRoster(
    id,
    match.tournament_id,
    match.away_team_id ?? "",
    match.sport_id
  );

  return NextResponse.json({
    home: home.players,
    away: away.players,
    max_subs: home.maxSubs ?? away.maxSubs,
  });
}
