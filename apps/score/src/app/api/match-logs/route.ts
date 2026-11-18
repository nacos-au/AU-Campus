import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import {
  listMatchStatLogs,
  upsertMatchStatLog,
  type UpsertMatchStatLogInput,
} from "@/lib/data/match-stat-logs";
import { parseSportParam } from "@/lib/utils/sport";

export async function GET(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const url = new URL(request.url);
  const sport = parseSportParam(url.searchParams.get("sport") ?? undefined);
  const tournamentId = url.searchParams.get("tournamentId");
  const season = url.searchParams.get("season");

  const logs = await listMatchStatLogs({
    sport,
    tournamentId: tournamentId || null,
    season: season || null,
  });
  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as UpsertMatchStatLogInput;
  if (!body.sport) {
    return NextResponse.json({ error: "sport required" }, { status: 400 });
  }

  const result = await upsertMatchStatLog(body, gate.staff.userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
