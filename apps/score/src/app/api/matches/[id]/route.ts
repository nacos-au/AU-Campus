import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { softDeleteMatch, updateMatch } from "@/lib/data/repository";
import type { MatchScope } from "@/lib/types/database";

export async function PATCH(
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
    status?: "scheduled" | "live" | "completed";
    scheduled_at?: string;
    venue_id?: string | null;
    scope?: MatchScope;
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
  const gate = await requireMatchStaff();
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
