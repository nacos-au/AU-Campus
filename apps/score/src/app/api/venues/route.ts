import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/roles";
import {
  createVenue,
  fetchVenues,
  softDeleteVenue,
  updateVenue,
} from "@/lib/data/repository";

/** Active venues are public (dropdowns). includeDeleted requires admin. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeDeleted = searchParams.get("includeDeleted") === "1";

  if (includeDeleted) {
    const admin = await requireAdmin();
    if ("error" in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
  }

  const venues = await fetchVenues({
    includeDeleted,
    sportSlug: searchParams.get("sport"),
  });
  return NextResponse.json({ venues });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = (await request.json()) as {
    name?: string;
    location?: string;
    sport_slug?: string;
  };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Venue name is required" }, { status: 400 });
  }
  if (!body.sport_slug?.trim()) {
    return NextResponse.json(
      { error: "Sport is required — pick football, basketball, tennis, track, or volleyball." },
      { status: 400 }
    );
  }

  const result = await createVenue({
    name: body.name,
    location: body.location,
    sport_slug: body.sport_slug,
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
    name?: string;
    location?: string;
    is_active?: boolean;
    sport_slug?: string | null;
  };
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const result = await updateVenue(body.id, {
    name: body.name,
    location: body.location,
    is_active: body.is_active,
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const result = await softDeleteVenue(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
