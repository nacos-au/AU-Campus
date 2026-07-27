import { NextResponse } from "next/server";
import { getScoreDemoMode } from "@/lib/data/mode";
import { createCompetition, type CreateCompetitionInput } from "@/lib/data/repository";

export async function POST(request: Request) {
  const body = (await request.json()) as CreateCompetitionInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Competition name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.teams) || body.teams.length < 2) {
    return NextResponse.json({ error: "At least 2 teams are required" }, { status: 400 });
  }
  if (!["league", "cup"].includes(body.competition_type)) {
    return NextResponse.json({ error: "competition_type must be league or cup" }, { status: 400 });
  }

  if (await getScoreDemoMode()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: `Demo: "${body.name}" validated (${body.teams.length} teams, ${body.competition_type}). Connect Supabase to persist.`,
    });
  }

  const result = await createCompetition(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id, message: "Competition created." });
}
