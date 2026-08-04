import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import {
  createGuestTeamRepo,
  fetchGuestTeams,
  softDeleteGuestTeam,
} from "@/lib/data/repository";
import { parseSportParam } from "@/lib/utils/sport";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sportParam = searchParams.get("sport");
  const sport = sportParam ? parseSportParam(sportParam) : undefined;
  const teams = await fetchGuestTeams(sport);
  return NextResponse.json({ teams });
}

export async function POST(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as {
    name?: string;
    sport?: string;
    institution?: string;
    logo_url?: string;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  }

  const result = await createGuestTeamRepo({
    name: body.name.trim(),
    sport: parseSportParam(body.sport),
    institution: body.institution?.trim() || null,
    logo_url: body.logo_url?.trim() || null,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const result = await softDeleteGuestTeam(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
