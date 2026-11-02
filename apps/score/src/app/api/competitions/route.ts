import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { listCompetitions } from "@/lib/data/competition-rosters";
import { getScoreDemoMode } from "@/lib/data/mode";
import { createCompetition, type CreateCompetitionInput } from "@/lib/data/repository";

export async function GET(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const sport = new URL(request.url).searchParams.get("sport") ?? undefined;
  const competitions = await listCompetitions(sport || undefined);
  return NextResponse.json({ competitions });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as CreateCompetitionInput;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Competition name is required" }, { status: 400 });
  }
  if (!Array.isArray(body.teams) || body.teams.length < 2) {
    return NextResponse.json({ error: "At least 2 teams are required" }, { status: 400 });
  }
  if (!["league", "cup", "event"].includes(body.competition_type)) {
    return NextResponse.json(
      { error: "competition_type must be league, cup, or event" },
      { status: 400 }
    );
  }

  if (body.competition_type === "event") {
    body.pairings = null;
    body.league_fixtures = null;
  }

  if (body.manual_fixtures?.length) {
    for (const f of body.manual_fixtures) {
      if (!f.home?.id || !f.away?.id || !f.scheduled_at) {
        return NextResponse.json(
          { error: "Each fixture needs home, away, and kick-off" },
          { status: 400 }
        );
      }
      if (f.home.id === f.away.id) {
        return NextResponse.json(
          { error: "A fixture cannot have the same team twice" },
          { status: 400 }
        );
      }
    }
  }

  const demo = await getScoreDemoMode();
  const result = await createCompetition(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const fixtureNote = result.fixtures
    ? ` ${result.fixtures} fixture${result.fixtures === 1 ? "" : "s"} are now open for keepers.`
    : body.competition_type === "event" && !body.manual_fixtures?.length
      ? " Add fixtures next, or recreate with the custom builder."
      : "";
  return NextResponse.json({
    ok: true,
    id: result.id,
    demo,
    fixtures: result.fixtures,
    message: demo
      ? `Demo: “${body.name}” created for this session.${fixtureNote}`
      : `Competition created.${fixtureNote}`,
  });
}
