import { NextResponse } from "next/server";
import { memoryCreate, memoryList, memoryUpsert } from "@/lib/phantom/store";
import type { CreatePhantomInput, PhantomSession } from "@/lib/phantom/types";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return NextResponse.json({ sessions: memoryList().filter((s) => s.status === "completed") });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("phantom_sessions")
    .select("*")
    .eq("status", "completed")
    .is("deleted_at", null)
    .order("concluded_at", { ascending: false })
    .limit(40) as { data: Array<Record<string, unknown>> | null };

  const sessions = (data ?? []).map(rowToSession);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreatePhantomInput;
  if (!body.settings?.teams?.length) {
    return NextResponse.json({ error: "Teams are required" }, { status: 400 });
  }

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const session = memoryCreate(body);
    return NextResponse.json({ session }, { status: 201 });
  }

  const session = memoryCreate(body);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await (supabase.from("phantom_sessions") as ReturnType<typeof supabase.from>)
    .insert({
      id: session.id,
      code: session.code,
      title: session.title,
      status: session.status,
      settings: session.settings,
      matches: session.matches,
      events: session.events,
      standings: session.standings,
      active_match_id: session.active_match_id,
      created_at: session.created_at,
      created_by: user?.id ?? null,
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error) {
    // Fall back to memory so the client flow never blocks
    memoryUpsert(session);
    return NextResponse.json({ session, warning: error.message }, { status: 201 });
  }

  const persisted = data ? rowToSession(data) : session;
  memoryUpsert(persisted);
  return NextResponse.json({ session: persisted }, { status: 201 });
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
