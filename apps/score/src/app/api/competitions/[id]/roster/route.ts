import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  addToCompetitionRoster,
  getCompetitionDetail,
  listCompetitionRoster,
  removeFromCompetitionRoster,
  setTeamFormation,
  updateCompetitionRosterMember,
} from "@/lib/data/competition-rosters";
import { normaliseAvailability } from "@/lib/match/lineup-merge";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const teamId = url.searchParams.get("teamId");

  if (!teamId) {
    const detail = await getCompetitionDetail(id);
    if ("error" in detail) {
      return NextResponse.json({ error: detail.error }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const roster = await listCompetitionRoster(id, teamId);
  if ("error" in roster) {
    return NextResponse.json({ error: roster.error }, { status: 400 });
  }
  return NextResponse.json(roster);
}

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    team_id?: string;
    player_id?: string;
    jersey_number?: number | null;
  };

  if (!body.team_id || !body.player_id) {
    return NextResponse.json({ error: "team_id and player_id are required" }, { status: 400 });
  }

  const result = await addToCompetitionRoster({
    tournament_id: id,
    team_id: body.team_id,
    player_id: body.player_id,
    jersey_number: body.jersey_number,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const playerId = url.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const result = await removeFromCompetitionRoster(id, playerId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Edit a nominated player (jersey, captain, availability) or a side's formation.
 * Body: { team_id, player_id, jersey_number?, is_captain?, availability?, availability_note? }
 *    or { team_id, formation }
 */
export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    team_id?: string;
    player_id?: string;
    jersey_number?: number | string | null;
    is_captain?: boolean;
    availability?: string;
    availability_note?: string | null;
    formation?: string;
  };
  if (!body.team_id) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  if (body.formation !== undefined) {
    const result = await setTeamFormation({
      tournament_id: id,
      team_id: body.team_id,
      formation: body.formation,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (!body.player_id) {
    return NextResponse.json({ error: "player_id is required" }, { status: 400 });
  }

  let jersey: number | null | undefined = undefined;
  if (body.jersey_number !== undefined) {
    if (body.jersey_number === null || body.jersey_number === "") {
      jersey = null;
    } else {
      const n = Number(body.jersey_number);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        return NextResponse.json({ error: "Jersey number must be between 1 and 99" }, { status: 400 });
      }
      jersey = n;
    }
  }

  const result = await updateCompetitionRosterMember({
    tournament_id: id,
    team_id: body.team_id,
    player_id: body.player_id,
    jersey_number: jersey,
    is_captain: body.is_captain,
    availability:
      body.availability !== undefined ? normaliseAvailability(body.availability) : undefined,
    availability_note: body.availability_note,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
