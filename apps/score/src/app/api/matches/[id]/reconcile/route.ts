import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import {
  reconcileMatchResult,
  type ReconcileGoalInput,
  type ReconcileGkInput,
  type ReconcileTeamStatsInput,
} from "@/lib/data/reconcile-match";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    home_score?: number;
    away_score?: number;
    goals?: ReconcileGoalInput[];
    team_stats?: ReconcileTeamStatsInput[];
    goalkeepers?: ReconcileGkInput[];
    mark_completed?: boolean;
  };

  if (
    typeof body.home_score !== "number" ||
    typeof body.away_score !== "number" ||
    !Array.isArray(body.goals)
  ) {
    return NextResponse.json(
      { error: "home_score, away_score, and goals[] are required" },
      { status: 400 }
    );
  }

  if (body.goals.length === 0 && (body.home_score > 0 || body.away_score > 0)) {
    return NextResponse.json(
      { error: "Non-zero scores need named goal scorers (and assists / solo)." },
      { status: 400 }
    );
  }

  const result = await reconcileMatchResult(id, {
    home_score: body.home_score,
    away_score: body.away_score,
    goals: body.goals,
    team_stats: body.team_stats,
    goalkeepers: body.goalkeepers,
    mark_completed: body.mark_completed,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
