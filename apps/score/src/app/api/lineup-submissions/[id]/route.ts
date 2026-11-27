import { NextResponse } from "next/server";
import { requireMatchStaff } from "@/lib/auth/roles";
import { reviewLineupSubmission } from "@/lib/data/lineup-links";

type Ctx = { params: Promise<{ id: string }> };

/** Staff approve or reject a rep submission. Approve writes the XI onto the match. */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "approve" | "reject";
    note?: string | null;
  } | null;
  if (body?.action !== "approve" && body?.action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }
  const result = await reviewLineupSubmission({ id, action: body.action, note: body.note ?? null });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
