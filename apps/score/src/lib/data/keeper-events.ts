import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";
import type { KeeperEvent, KeeperEventAssignment } from "@/lib/keeper/keeper-events-types";
import {
  assignKeeperDemo,
  createKeeperEventDemo,
  listAssignedKeeperEventsDemo,
  listAssignmentsForEventDemo,
  listKeeperEventsDemo,
  softDeleteKeeperEventDemo,
  unassignKeeperDemo,
  updateKeeperEventDemo,
} from "@/lib/keeper/keeper-events-store";
import type { SportId } from "@/lib/utils/sport";

function rowToEvent(row: Record<string, unknown>): KeeperEvent {
  return {
    id: String(row.id),
    sport_slug: String(row.sport_slug),
    title: String(row.title),
    scheduled_at: String(row.scheduled_at),
    venue_id: (row.venue_id as string | null) ?? null,
    tournament_id: (row.tournament_id as string | null) ?? null,
    match_id: (row.match_id as string | null) ?? null,
    status: row.status as KeeperEvent["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: (row.deleted_at as string | null) ?? null,
  };
}

export async function fetchKeeperEvents(opts?: {
  sport?: string | null;
  includeDeleted?: boolean;
}): Promise<KeeperEvent[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listKeeperEventsDemo(opts);
  }

  const supabase = await createClient();
  let query = supabase.from("keeper_events").select("*").order("scheduled_at", { ascending: true });
  if (!opts?.includeDeleted) query = query.is("deleted_at", null);
  if (opts?.sport) query = query.eq("sport_slug", opts.sport);

  const { data, error } = await query;
  if (error || !data) return [];

  const events = (data as Record<string, unknown>[]).map(rowToEvent);
  const ids = events.map((e) => e.id);
  if (ids.length === 0) return events;

  const { data: assigns } = await supabase
    .from("record_keeper_assignments")
    .select("user_id, keeper_event_id")
    .in("keeper_event_id", ids);

  const byEvent = new Map<string, string[]>();
  for (const a of (assigns as { user_id: string; keeper_event_id: string }[] | null) ?? []) {
    const list = byEvent.get(a.keeper_event_id) ?? [];
    list.push(a.user_id);
    byEvent.set(a.keeper_event_id, list);
  }

  return events.map((e) => ({
    ...e,
    assignee_ids: byEvent.get(e.id) ?? [],
  }));
}

export async function fetchAssignedKeeperEvents(userId: string): Promise<KeeperEvent[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listAssignedKeeperEventsDemo(userId);
  }

  const supabase = await createClient();
  const { data: assigns } = await supabase
    .from("record_keeper_assignments")
    .select("keeper_event_id")
    .eq("user_id", userId)
    .not("keeper_event_id", "is", null);

  const ids = ((assigns as { keeper_event_id: string }[] | null) ?? [])
    .map((a) => a.keeper_event_id)
    .filter(Boolean);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("keeper_events")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToEvent);
}

export async function createKeeperEvent(input: {
  sport_slug: SportId | string;
  title: string;
  scheduled_at: string;
  venue_id?: string | null;
  tournament_id?: string | null;
  match_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): Promise<{ event: KeeperEvent } | { error: string }> {
  if (!input.title.trim()) return { error: "Event title is required." };
  if (!input.scheduled_at) return { error: "Scheduled date/time is required." };
  if (!input.sport_slug) return { error: "Sport is required." };

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { event: createKeeperEventDemo(input) };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("keeper_events") as ReturnType<typeof supabase.from>)
    .insert({
      sport_slug: input.sport_slug,
      title: input.title.trim(),
      scheduled_at: input.scheduled_at,
      venue_id: input.venue_id ?? null,
      tournament_id: input.tournament_id ?? null,
      match_id: input.match_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error || !data) return { error: error?.message ?? "Could not create event." };
  return { event: rowToEvent(data) };
}

export async function updateKeeperEvent(
  id: string,
  patch: Partial<{
    title: string;
    scheduled_at: string;
    venue_id: string | null;
    match_id: string | null;
    status: KeeperEvent["status"];
    notes: string | null;
    sport_slug: string;
  }>
): Promise<{ event: KeeperEvent } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const event = updateKeeperEventDemo(id, patch);
    if (!event) return { error: "Event not found." };
    return { event };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("keeper_events") as ReturnType<typeof supabase.from>)
    .update({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id)
    .select("*")
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error || !data) return { error: error?.message ?? "Could not update event." };
  return { event: rowToEvent(data) };
}

export async function softDeleteKeeperEvent(
  id: string
): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    if (!softDeleteKeeperEventDemo(id)) return { error: "Event not found." };
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("keeper_events") as ReturnType<typeof supabase.from>)
    .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}

export async function assignKeeperToEvent(input: {
  keeper_event_id: string;
  user_id: string;
  assigned_by?: string | null;
  display_name?: string | null;
  email?: string | null;
}): Promise<{ assignment: KeeperEventAssignment } | { error: string }> {
  if (!input.user_id) return { error: "Pick a record keeper to assign." };
  if (!input.keeper_event_id) return { error: "Event is required." };

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const result = assignKeeperDemo(input);
    if ("error" in result) return result;
    return { assignment: result };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("record_keeper_assignments") as ReturnType<
    typeof supabase.from
  >)
    .insert({
      user_id: input.user_id,
      keeper_event_id: input.keeper_event_id,
      match_id: null,
      assigned_by: input.assigned_by ?? null,
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Record<string, unknown> | null; error: { message: string } | null };

  if (error || !data) {
    if (/duplicate|unique/i.test(error?.message ?? "")) {
      return { error: "That keeper is already assigned to this event." };
    }
    return { error: error?.message ?? "Could not assign keeper." };
  }

  const row = data;
  return {
    assignment: {
      id: String(row.id),
      user_id: String(row.user_id),
      keeper_event_id: String(row.keeper_event_id),
      assigned_at: String(row.assigned_at ?? new Date().toISOString()),
      assigned_by: (row.assigned_by as string | null) ?? null,
      display_name: input.display_name ?? null,
      email: input.email ?? null,
    },
  };
}

export async function unassignKeeperFromEvent(
  keeper_event_id: string,
  user_id: string
): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    if (!unassignKeeperDemo(keeper_event_id, user_id)) {
      return { error: "Assignment not found." };
    }
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("record_keeper_assignments")
    .delete()
    .eq("keeper_event_id", keeper_event_id)
    .eq("user_id", user_id);

  if (error) return { error: error.message };
  return { ok: true };
}

export async function listEventAssignments(
  keeper_event_id: string
): Promise<KeeperEventAssignment[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listAssignmentsForEventDemo(keeper_event_id);
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("record_keeper_assignments")
    .select("id, user_id, keeper_event_id, assigned_at, assigned_by")
    .eq("keeper_event_id", keeper_event_id);

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: String(row.id),
    user_id: String(row.user_id),
    keeper_event_id: String(row.keeper_event_id),
    assigned_at: String(row.assigned_at),
    assigned_by: (row.assigned_by as string | null) ?? null,
  }));
}

/** List Score record keepers for assignment picker (demo: single demo keeper). */
export async function listRecordKeeperCandidates(): Promise<
  Array<{ id: string; display_name: string; email: string | null }>
> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return [{ id: "demo-admin", display_name: "Demo Keeper", email: "demo@local" }];
  }

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("app_roles")
    .select("user_id, role")
    .eq("app", "score")
    .in("role", ["record_keeper", "admin"]);

  const ids = [...new Set(((roles as { user_id: string }[] | null) ?? []).map((r) => r.user_id))];
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", ids);

  return ((profiles as { id: string; display_name: string | null; email: string | null }[] | null) ?? []).map(
    (p) => ({
      id: p.id,
      display_name: p.display_name?.trim() || p.email || p.id,
      email: p.email,
    })
  );
}
