import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/roles";
import { applyReschedule, listCompetitionSchedule } from "@/lib/data/fixture-schedule";
import { isValidIso, planReschedule, rowKey, type FixtureKind } from "@/lib/schedule/shift-fixtures";

type Ctx = { params: Promise<{ id: string }> };

const MAX_CHANGES = 200;

/**
 * Admin-only. Moves fixtures of one competition to new kick-off times.
 * The client previews the plan; the server re-validates it from scratch and
 * the database RPC applies it atomically and writes the audit log.
 */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await ctx.params;

  let body: {
    reason?: unknown;
    changes?: Array<{ kind?: unknown; id?: unknown; scheduled_at?: unknown }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: "Reason is too long (max 500 characters)" }, { status: 400 });
  }
  if (!Array.isArray(body.changes) || body.changes.length === 0) {
    return NextResponse.json({ error: "No changes supplied" }, { status: 400 });
  }
  if (body.changes.length > MAX_CHANGES) {
    return NextResponse.json(
      { error: `Too many changes in one go (max ${MAX_CHANGES})` },
      { status: 400 }
    );
  }

  const edits: Record<string, string> = {};
  for (const c of body.changes) {
    const kind = c.kind;
    if ((kind !== "match" && kind !== "bracket") || typeof c.id !== "string") {
      return NextResponse.json({ error: "Each change needs a kind and id" }, { status: 400 });
    }
    if (typeof c.scheduled_at !== "string" || !isValidIso(c.scheduled_at)) {
      return NextResponse.json({ error: "Each change needs a valid date" }, { status: 400 });
    }
    edits[rowKey(kind as FixtureKind, c.id)] = c.scheduled_at;
  }

  // Only fixtures that belong to this competition, and only movable ones.
  const { rows } = await listCompetitionSchedule(id);
  const plan = planReschedule(rows, edits);
  const blocker = plan.warnings.find((w) => w.level === "error");
  if (blocker) {
    return NextResponse.json({ error: blocker.message }, { status: 400 });
  }
  if (plan.changes.length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const result = await applyReschedule({
    tournamentId: id,
    changes: plan.changes.map((c) => ({ kind: c.kind, id: c.id, scheduled_at: c.to })),
    reason,
    actorName: gate.staff.email,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, changed: result.changed, batch_id: result.batch_id });
}
