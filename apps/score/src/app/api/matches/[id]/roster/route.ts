import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { listCompetitionRoster } from "@/lib/data/competition-rosters";
import { fetchMatchLineup } from "@/lib/data/match-lineups";
import { fetchMatchById, fetchSquadForTeam } from "@/lib/data/repository";
import type { SquadPlayer } from "@/lib/data/demo-squads";

type Ctx = { params: Promise<{ id: string }> };

async function sideRoster(
  matchId: string,
  tournamentId: string | null | undefined,
  teamId: string,
  sportId: string
): Promise<SquadPlayer[]> {
  if (!teamId) return [];

  const lineup = await fetchMatchLineup(matchId, teamId);
  if (lineup?.players?.length) {
    const squad = await fetchSquadForTeam(teamId, sportId);
    const byId = new Map(squad.map((p) => [p.id, p]));
    return lineup.players.flatMap((entry) => {
      const p = byId.get(entry.player_id);
      if (!p) return [];
      return [
        {
          ...p,
          squad_role: entry.is_starting ? "Starting" : entry.role ?? "Substitute",
        },
      ];
    });
  }

  if (tournamentId) {
    const roster = await listCompetitionRoster(tournamentId, teamId);
    if (!("error" in roster) && roster.nominated.length > 0) {
      return roster.nominated.map(
        (p) =>
          ({
            id: p.player_id,
            department_id: "",
            first_name: p.first_name,
            last_name: p.last_name,
            matric_number: p.matric_number,
            avatar_url: p.avatar_url,
            position: p.position,
            jersey_number: p.jersey_number ?? undefined,
            squad_role: p.position ?? "Squad",
          }) satisfies SquadPlayer
      );
    }
  }

  return fetchSquadForTeam(teamId, sportId);
}

/** Keeper match-day squad: lineup → competition roster → club pool. */
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

  return NextResponse.json({ home, away });
}
