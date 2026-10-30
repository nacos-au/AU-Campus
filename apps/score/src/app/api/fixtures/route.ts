import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { fetchOpenCompetitionFixtures } from "@/lib/data/fixtures";
import { parseSportParam } from "@/lib/utils/sport";

/** Open competition fixtures (scheduled/live, non-friendly) a keeper can pick up. */
export async function GET(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("sport");
  const sport = raw && raw !== "all" ? parseSportParam(raw) : undefined;
  const fixtures = await fetchOpenCompetitionFixtures(sport);
  return NextResponse.json({ sport: sport ?? "all", fixtures });
}
