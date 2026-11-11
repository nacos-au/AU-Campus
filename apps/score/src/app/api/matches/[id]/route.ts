import { NextResponse } from "next/server";
import { requireAdmin, requireMatchStaff } from "@/lib/auth/roles";
import { fetchMatchById, softDeleteMatch, updateMatch } from "@/lib/data/repository";
import type { MatchScope } from "@/lib/types/database";

/** Resolve one match (used by the keeper console to open an assigned fixture). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json({ match });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Keepers need to write live scores/periods; admin for venue/schedule edits.
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    home_score?: number;
    away_score?: number;
    home_penalties?: number | null;
    away_penalties?: number | null;
    current_period?: string;
    went_to_extra_time?: boolean;
    status?: "scheduled" | "live" | "completed" | "postponed";
    scheduled_at?: string;
    venue_id?: string | null;
    scope?: MatchScope;
    allows_extra_time?: boolean;
    allows_penalty_shootout?: boolean;
    lineup_image_url?: string | null;
    referee_name?: string | null;
    assistant_referee_1?: string | null;
    assistant_referee_2?: string | null;
    postpone_reason?: string | null;
  };

  const result = await updateMatch(id, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const result = await softDeleteMatch(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
