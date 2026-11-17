import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import { archiveCompetition } from "@/lib/data/repository";

/** Archive a competition: set `is_draft` and soft-delete all its matches. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Competition id required" }, { status: 400 });
  }

  const result = await archiveCompetition(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    matches_deleted: result.matches_deleted,
    message: `Competition archived. ${result.matches_deleted} match${
      result.matches_deleted === 1 ? "" : "es"
    } soft-deleted.`,
  });
}
