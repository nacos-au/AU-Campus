import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  createLineupLink,
  generateMissingLineupLinks,
  getLinkOverview,
  revokeLineupLink,
  setCompetitionCutoff,
  setLinkCutoffs,
} from "@/lib/data/lineup-links";
import { clampCutoffMinutes } from "@/lib/lineup-links/cutoff";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const overview = await getLinkOverview(id);
  if ("error" in overview) {
    return NextResponse.json({ error: overview.error }, { status: 404 });
  }
  return NextResponse.json(overview);
}

type Action =
  | { action: "create"; team_id: string; cutoff_minutes?: number | null }
  | { action: "generate_missing"; team_ids?: string[]; cutoff_minutes?: number | null }
  | { action: "revoke"; link_id: string }
  | { action: "set_cutoff"; link_ids?: string[]; team_ids?: string[]; cutoff_minutes: number | null }
  | { action: "set_default"; cutoff_minutes: number };

/**
 * Submission links for a competition. Tokens are returned once; only a hash is stored.
 * Cut-off: a link override wins; no override means the competition default (60 min).
 */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireAdmin();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Action | null;
  if (!body?.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const cutoffField = (raw: unknown, allowNull: boolean): number | null | "invalid" => {
    if (raw === null || raw === undefined || raw === "") return allowNull ? null : "invalid";
    const parsed = clampCutoffMinutes(raw);
    return parsed === null ? "invalid" : parsed;
  };

  const badCutoff = () =>
    NextResponse.json(
      { error: "Cut-off must be a whole number of minutes between 0 and 1440." },
      { status: 400 }
    );

  if (body.action === "create") {
    if (!body.team_id) return NextResponse.json({ error: "team_id is required" }, { status: 400 });
    const cutoff = cutoffField(body.cutoff_minutes, true);
    if (cutoff === "invalid") return badCutoff();
    const result = await createLineupLink({
      tournament_id: id,
      team_id: body.team_id,
      cutoff_minutes: cutoff,
      created_by: gate.staff.userId,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, link_id: result.link_id, token: result.token });
  }

  if (body.action === "generate_missing") {
    const cutoff = cutoffField(body.cutoff_minutes, true);
    if (cutoff === "invalid") return badCutoff();
    const result = await generateMissingLineupLinks({
      tournament_id: id,
      team_ids: body.team_ids,
      cutoff_minutes: cutoff,
      created_by: gate.staff.userId,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, created: result.created });
  }

  if (body.action === "revoke") {
    if (!body.link_id) return NextResponse.json({ error: "link_id is required" }, { status: 400 });
    const result = await revokeLineupLink(id, body.link_id);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "set_cutoff") {
    const cutoff = cutoffField(body.cutoff_minutes, true);
    if (cutoff === "invalid") return badCutoff();
    const result = await setLinkCutoffs({
      tournament_id: id,
      link_ids: body.link_ids,
      team_ids: body.team_ids,
      cutoff_minutes: cutoff,
    });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, updated: result.updated });
  }

  if (body.action === "set_default") {
    const cutoff = cutoffField(body.cutoff_minutes, false);
    if (cutoff === "invalid" || cutoff === null) return badCutoff();
    const result = await setCompetitionCutoff(id, cutoff);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
