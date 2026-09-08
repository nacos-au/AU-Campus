import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  assignKeeperToEvent,
  listEventAssignments,
  listRecordKeeperCandidates,
  unassignKeeperFromEvent,
} from "@/lib/data/keeper-events";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const [assignments, candidates] = await Promise.all([
    listEventAssignments(id),
    listRecordKeeperCandidates(),
  ]);
  return NextResponse.json({ assignments, candidates });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    user_id?: string;
    display_name?: string | null;
    email?: string | null;
  };

  if (!body.user_id) {
    return NextResponse.json(
      { error: "Pick a record keeper — user_id is required." },
      { status: 400 }
    );
  }

  const result = await assignKeeperToEvent({
    keeper_event_id: id,
    user_id: body.user_id,
    assigned_by: admin.staff.userId,
    display_name: body.display_name,
    email: body.email,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const result = await unassignKeeperFromEvent(id, userId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
