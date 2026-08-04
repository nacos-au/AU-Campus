import { NextResponse } from "next/server";
import { memoryGet, memoryUpsert } from "@/lib/phantom/store";
import type { PhantomSession } from "@/lib/phantom/types";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mem = memoryGet(id);

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    if (!mem) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ session: mem });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("phantom_sessions")
    .select("*")
    .or(`id.eq.${id},code.eq.${id.toUpperCase()}`)
    .is("deleted_at", null)
    .maybeSingle() as { data: Record<string, unknown> | null };

  if (!data) {
    if (mem) return NextResponse.json({ session: mem });
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session: rowToSession(data) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as { session?: PhantomSession };
  if (!body.session) {
    return NextResponse.json({ error: "session payload required" }, { status: 400 });
  }

  const session = memoryUpsert(body.session);

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return NextResponse.json({ session });
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("phantom_sessions") as ReturnType<typeof supabase.from>)
    .upsert({
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      settings: session.settings,
      matches: session.matches,
      events: session.events,
      standings: session.standings,
      active_match_id: session.active_match_id,
      concluded_at: session.concluded_at,
      created_at: session.created_at,
    } as Record<string, unknown>) as { error: { message: string } | null };

  if (error) {
    return NextResponse.json({ session, warning: error.message });
  }

  return NextResponse.json({ session });
}

function rowToSession(row: Record<string, unknown>): PhantomSession {
  return {
    id: String(row.id),
    code: String(row.code),
    title: String(row.title),
    status: row.status as PhantomSession["status"],
    settings: row.settings as PhantomSession["settings"],
    matches: (row.matches as PhantomSession["matches"]) ?? [],
    events: (row.events as PhantomSession["events"]) ?? [],
    standings: (row.standings as PhantomSession["standings"]) ?? [],
    active_match_id: (row.active_match_id as string | null) ?? null,
    created_at: String(row.created_at),
    concluded_at: (row.concluded_at as string | null) ?? null,
  };
}
