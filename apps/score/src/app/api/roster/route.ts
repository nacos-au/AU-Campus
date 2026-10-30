import { NextResponse } from "next/server";
import { requireAdmin, requireMatchStaff } from "@/lib/auth/roles";
import {
  fetchDepartments,
  fetchPlayersForSport,
  fetchTeamsForSport,
  importRoster,
  updatePlayerAvatar,
  updateTeamLogo,
  type RosterImportInput,
} from "@/lib/data/roster";
import { parseSportParam, sportToDbId } from "@/lib/utils/sport";

/** Teams (department + guest), departments, and optional players for a sport. */
export async function GET(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { searchParams } = new URL(request.url);
  const sport = parseSportParam(searchParams.get("sport") ?? undefined);
  const includePlayers = searchParams.get("players") === "1" || searchParams.get("players") === "true";
  const teamId = searchParams.get("teamId");

  const [teams, departments] = await Promise.all([fetchTeamsForSport(sport), fetchDepartments()]);
  if (!includePlayers) {
    return NextResponse.json({ sport, teams, departments });
  }

  const players = await fetchPlayersForSport(sport, teamId);
  return NextResponse.json({ sport, teams, departments, players });
}

/** Bulk import of teams and/or players for one sport. Admin only. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as {
    sport?: string;
    teams?: RosterImportInput["teams"];
    players?: RosterImportInput["players"];
  };

  const sport = parseSportParam(body.sport);
  const teams = Array.isArray(body.teams) ? body.teams : [];
  const players = Array.isArray(body.players) ? body.players : [];

  if (!teams.length && !players.length) {
    return NextResponse.json({ error: "Nothing to import — paste a list first." }, { status: 400 });
  }
  if (teams.length + players.length > 2000) {
    return NextResponse.json({ error: "Import at most 2,000 rows at a time." }, { status: 400 });
  }

  const result = await importRoster({
    sport_id: sportToDbId(sport),
    teams: teams.map((t) => ({
      name: String(t.name ?? "").trim(),
      department_code: String(t.department_code ?? "").trim(),
      department_name: t.department_name ? String(t.department_name).trim() : null,
    })),
    players: players.map((p) => ({
      first_name: String(p.first_name ?? "").trim(),
      last_name: String(p.last_name ?? "").trim(),
      matric_number: p.matric_number ? String(p.matric_number).trim() : null,
      position: p.position ? String(p.position).trim() : null,
      jersey_number:
        p.jersey_number === null || p.jersey_number === undefined || Number.isNaN(Number(p.jersey_number))
          ? null
          : Number(p.jersey_number),
      team_id: p.team_id ? String(p.team_id) : null,
      team_name: p.team_name ? String(p.team_name).trim() : null,
    })),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result });
}

/**
 * Update image URLs on a team or player.
 * Body: { kind: "team_logo" | "player_avatar", id: string, url: string }
 */
export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as {
    kind?: string;
    id?: string;
    url?: string;
  };

  const id = body.id?.trim();
  const url = body.url?.trim();
  if (!id || !url) {
    return NextResponse.json({ error: "id and url are required" }, { status: 400 });
  }

  if (body.kind === "team_logo") {
    const result = await updateTeamLogo(id, url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, team: result });
  }

  if (body.kind === "player_avatar") {
    const result = await updatePlayerAvatar(id, url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, player: result });
  }

  return NextResponse.json({ error: "kind must be team_logo or player_avatar" }, { status: 400 });
}
