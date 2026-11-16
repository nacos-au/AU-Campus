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
    allow_score_only?: boolean;
  };

  if (typeof body.home_score !== "number" || typeof body.away_score !== "number") {
    return NextResponse.json({ error: "home_score and away_score are required" }, { status: 400 });
  }

  const goals = Array.isArray(body.goals) ? body.goals : [];
  const allowScoreOnly = body.allow_score_only === true;

  if (goals.length === 0 && (body.home_score > 0 || body.away_score > 0) && !allowScoreOnly) {
    return NextResponse.json(
      {
        error:
          "Add scorers, or set allow_score_only to save the final score without goal details yet.",
      },
      { status: 400 }
    );
  }

  const result = await reconcileMatchResult(id, {
    home_score: body.home_score,
    away_score: body.away_score,
    goals,
    allow_score_only: allowScoreOnly,
    team_stats: body.team_stats,
    goalkeepers: body.goalkeepers,
    mark_completed: body.mark_completed,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
