import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import {
  getMatchStatLog,
  upsertMatchStatLog,
  type UpsertMatchStatLogInput,
} from "@/lib/data/match-stat-logs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await params;
  const log = await getMatchStatLog(id);
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ log });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await params;
  const body = (await request.json()) as UpsertMatchStatLogInput;
  const result = await upsertMatchStatLog({ ...body, id }, gate.staff.userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
