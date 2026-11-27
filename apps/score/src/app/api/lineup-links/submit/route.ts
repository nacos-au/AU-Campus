import { NextResponse } from "next/server";
import { submitLineupViaLink } from "@/lib/data/lineup-links";
import { looksLikeLineupToken } from "@/lib/lineup-links/token";
import type { SheetEntry } from "@/lib/match/lineup-merge";

/**
 * Public endpoint for team reps. Access is the private link token only (no account).
 * Writes a Pending submission; staff approve it before it goes live on the match.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    match_id?: string;
    players?: unknown;
    formation?: string | null;
    coach_name?: string | null;
  } | null;

  if (!body?.token || !looksLikeLineupToken(body.token)) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 400 });
  }
  if (!body.match_id || !Array.isArray(body.players)) {
    return NextResponse.json({ error: "Pick a match and name your players." }, { status: 400 });
  }

  const players: SheetEntry[] = [];
  for (const raw of body.players) {
    const p = raw as Record<string, unknown>;
    if (typeof p.player_id !== "string" || !p.player_id) {
      return NextResponse.json({ error: "Each player needs an id." }, { status: 400 });
    }
    players.push({
      player_id: p.player_id,
      is_starting: p.is_starting === true,
      role: typeof p.role === "string" ? p.role : null,
      is_captain: p.is_captain === true,
      jersey_number: typeof p.jersey_number === "number" ? p.jersey_number : null,
    });
  }

  const result = await submitLineupViaLink({
    token: body.token,
    match_id: body.match_id,
    players,
    formation: typeof body.formation === "string" ? body.formation : null,
    coach_name: typeof body.coach_name === "string" ? body.coach_name.slice(0, 120) : null,
  });
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error, errors: result.errors },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, id: result.id, status: "pending", warnings: result.warnings });
}
