import { NextResponse } from "next/server";
import { fetchMatchById, fetchMatchEvents } from "@/lib/data/repository";

/**
 * Public live snapshot — match row (scores/status/clock) + events.
 * No auth: spectators poll this while a keeper is moderating.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [match, events] = await Promise.all([fetchMatchById(id), fetchMatchEvents(id)]);
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json({ match, events });
}
