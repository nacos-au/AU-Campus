import { NextResponse } from "next/server";
import { requireAdmin, requireMatchStaff, getSessionStaff } from "@/lib/auth/roles";
import {
  createKeeperEvent,
  fetchAssignedKeeperEvents,
  fetchKeeperEvents,
  softDeleteKeeperEvent,
  updateKeeperEvent,
} from "@/lib/data/keeper-events";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get("mine") === "1";
  const sport = searchParams.get("sport");

  if (mine) {
    const staff = await getSessionStaff();
    if (!staff || (!staff.isRecordKeeper && !staff.isAdmin)) {
      return NextResponse.json({ error: "Record keeper access required" }, { status: 403 });
    }
    const events = await fetchAssignedKeeperEvents(staff.userId);
    return NextResponse.json({ events });
  }

  const gate = await requireMatchStaff();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (gate.staff.isAdmin) {
    const events = await fetchKeeperEvents({ sport, includeDeleted: false });
    return NextResponse.json({ events });
  }

  const events = await fetchAssignedKeeperEvents(gate.staff.userId);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json()) as {
    sport_slug?: string;
    title?: string;
    scheduled_at?: string;
    venue_id?: string | null;
    match_id?: string | null;
    notes?: string | null;
  };

  const result = await createKeeperEvent({
    sport_slug: body.sport_slug ?? "",
    title: body.title ?? "",
    scheduled_at: body.scheduled_at ?? "",
    venue_id: body.venue_id,
    match_id: body.match_id,
    notes: body.notes,
    created_by: admin.staff.userId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json()) as {
    id?: string;
    title?: string;
    scheduled_at?: string;
    venue_id?: string | null;
    match_id?: string | null;
    status?: "scheduled" | "live" | "completed" | "cancelled";
    notes?: string | null;
    sport_slug?: string;
  };

  if (!body.id) {
    return NextResponse.json({ error: "Event id is required." }, { status: 400 });
  }

  const result = await updateKeeperEvent(body.id, {
    title: body.title,
    scheduled_at: body.scheduled_at,
    venue_id: body.venue_id,
    match_id: body.match_id,
    status: body.status,
    notes: body.notes,
    sport_slug: body.sport_slug,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const result = await softDeleteKeeperEvent(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
