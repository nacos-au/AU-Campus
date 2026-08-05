import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { getAwardsForSport } from "@/lib/data/demo-awards";
import type { SeasonAward } from "@/lib/data/demo-awards";
import { getScoreDemoMode } from "@/lib/data/mode";
import { fetchSeasonAwards, upsertSeasonAward } from "@/lib/data/repository";
import { parseSportParam, sportToDbId } from "@/lib/utils/sport";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = parseSportParam(searchParams.get("sport") ?? undefined);
  const sportDbId = sportToDbId(sport);
  const season = searchParams.get("season") ?? "2025/26";

  if (await getScoreDemoMode()) {
    return NextResponse.json({ awards: getAwardsForSport(sportDbId) });
  }

  const awards = await fetchSeasonAwards(sportDbId, season);
  return NextResponse.json({ awards });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as SeasonAward;

  if (await getScoreDemoMode()) {
    return NextResponse.json({
      ok: true,
      message: "Demo mode: use Admin panel (saved to localStorage)",
      award: body,
    });
  }

  const result = await upsertSeasonAward({
    sport_id: body.sport_id,
    award_type: body.award_type,
    season: body.season,
    week_number: body.week_number,
    player_id: body.player_id,
    team_id: body.team_id,
    player_name: body.player_name,
    team_name: body.team_name,
    value: body.value,
    label: body.label,
    lineup: body.lineup,
    published: body.published,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
