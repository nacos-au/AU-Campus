import type { KeeperEvent, KeeperEventAssignment } from "@/lib/keeper/keeper-events-types";
import type { SportId } from "@/lib/utils/sport";

const EVENTS_KEY = "au-score-keeper-events";
const ASSIGN_KEY = "au-score-keeper-event-assignments";

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function readEvents(): KeeperEvent[] {
  if (typeof window === "undefined") return memoryEvents.slice();
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as KeeperEvent[]) : memoryEvents.slice();
  } catch {
    return memoryEvents.slice();
  }
}

function writeEvents(events: KeeperEvent[]) {
  memoryEvents = events;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    /* ignore */
  }
}

function readAssignments(): KeeperEventAssignment[] {
  if (typeof window === "undefined") return memoryAssignments.slice();
  try {
    const raw = localStorage.getItem(ASSIGN_KEY);
    return raw ? (JSON.parse(raw) as KeeperEventAssignment[]) : memoryAssignments.slice();
  } catch {
    return memoryAssignments.slice();
  }
}

function writeAssignments(rows: KeeperEventAssignment[]) {
  memoryAssignments = rows;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ASSIGN_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

/** Server/demo memory (survives within process). */
let memoryEvents: KeeperEvent[] = [
  {
    id: "kev-demo-1",
    sport_slug: "football",
    title: "CSC FC vs MEC Giants — Matchweek 10",
    scheduled_at: new Date().toISOString(),
    venue_id: null,
    venue_name: "Achievers Main Field",
    tournament_id: null,
    match_id: "match-1",
    status: "scheduled",
    notes: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "kev-demo-2",
    sport_slug: "basketball",
    title: "Med Court Kings vs CSC Hoops",
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    venue_id: null,
    venue_name: "Basketball Court A",
    tournament_id: null,
    match_id: "match-4",
    status: "scheduled",
    notes: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "kev-demo-3",
    sport_slug: "track",
    title: "Inter-Faculty 100m Finals",
    scheduled_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    venue_id: null,
    venue_name: "Achievers Main Field Track",
    tournament_id: null,
    match_id: null,
    status: "scheduled",
    notes: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let memoryAssignments: KeeperEventAssignment[] = [
  {
    id: "ka-demo-1",
    user_id: "demo-admin",
    keeper_event_id: "kev-demo-1",
    assigned_at: new Date().toISOString(),
    assigned_by: null,
    display_name: "Demo Keeper",
    email: "demo@local",
  },
  {
    id: "ka-demo-2",
    user_id: "demo-admin",
    keeper_event_id: "kev-demo-2",
    assigned_at: new Date().toISOString(),
    assigned_by: null,
    display_name: "Demo Keeper",
    email: "demo@local",
  },
  {
    id: "ka-demo-3",
    user_id: "demo-admin",
    keeper_event_id: "kev-demo-3",
    assigned_at: new Date().toISOString(),
    assigned_by: null,
    display_name: "Demo Keeper",
    email: "demo@local",
  },
];

export function listKeeperEventsDemo(opts?: {
  sport?: string | null;
  includeDeleted?: boolean;
}): KeeperEvent[] {
  let events = readEvents().filter((e) => opts?.includeDeleted || !e.deleted_at);
  if (opts?.sport) events = events.filter((e) => e.sport_slug === opts.sport);
  const assigns = readAssignments();
  return events
    .map((e) => {
      const mine = assigns.filter((a) => a.keeper_event_id === e.id);
      return {
        ...e,
        assignee_ids: mine.map((a) => a.user_id),
        assignee_names: mine.map((a) => a.display_name || a.email || a.user_id),
      };
    })
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
}

export function listAssignedKeeperEventsDemo(userId: string): KeeperEvent[] {
  const assigns = readAssignments().filter((a) => a.user_id === userId);
  const ids = new Set(assigns.map((a) => a.keeper_event_id));
  return listKeeperEventsDemo().filter((e) => ids.has(e.id));
}

export function createKeeperEventDemo(input: {
  sport_slug: SportId | string;
  title: string;
  scheduled_at: string;
  venue_id?: string | null;
  venue_name?: string | null;
  tournament_id?: string | null;
  match_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
}): KeeperEvent {
  const now = new Date().toISOString();
  const event: KeeperEvent = {
    id: uid("kev"),
    sport_slug: input.sport_slug,
    title: input.title.trim(),
    scheduled_at: input.scheduled_at,
    venue_id: input.venue_id ?? null,
    venue_name: input.venue_name ?? null,
    tournament_id: input.tournament_id ?? null,
    match_id: input.match_id ?? null,
    status: "scheduled",
    notes: input.notes ?? null,
    created_by: input.created_by ?? null,
    created_at: now,
    updated_at: now,
    assignee_ids: [],
    assignee_names: [],
  };
  writeEvents([event, ...readEvents().filter((e) => e.id !== event.id)]);
  return event;
}

export function updateKeeperEventDemo(
  id: string,
  patch: Partial<Pick<KeeperEvent, "title" | "scheduled_at" | "venue_id" | "venue_name" | "match_id" | "status" | "notes" | "sport_slug">>
): KeeperEvent | null {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = { ...all[idx]!, ...patch, updated_at: new Date().toISOString() };
  all[idx] = next;
  writeEvents(all);
  return next;
}

export function softDeleteKeeperEventDemo(id: string): boolean {
  const all = readEvents();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return false;
  all[idx] = { ...all[idx]!, deleted_at: new Date().toISOString() };
  writeEvents(all);
  return true;
}

export function assignKeeperDemo(input: {
  keeper_event_id: string;
  user_id: string;
  assigned_by?: string | null;
  display_name?: string | null;
  email?: string | null;
}): KeeperEventAssignment | { error: string } {
  const events = readEvents();
  if (!events.some((e) => e.id === input.keeper_event_id && !e.deleted_at)) {
    return { error: "Event not found." };
  }
  const existing = readAssignments().find(
    (a) => a.keeper_event_id === input.keeper_event_id && a.user_id === input.user_id
  );
  if (existing) return existing;
  const row: KeeperEventAssignment = {
    id: uid("ka"),
    user_id: input.user_id,
    keeper_event_id: input.keeper_event_id,
    assigned_at: new Date().toISOString(),
    assigned_by: input.assigned_by ?? null,
    display_name: input.display_name ?? null,
    email: input.email ?? null,
  };
  writeAssignments([row, ...readAssignments()]);
  return row;
}

export function unassignKeeperDemo(keeper_event_id: string, user_id: string): boolean {
  const next = readAssignments().filter(
    (a) => !(a.keeper_event_id === keeper_event_id && a.user_id === user_id)
  );
  if (next.length === readAssignments().length) return false;
  writeAssignments(next);
  return true;
}

export function listAssignmentsForEventDemo(keeper_event_id: string): KeeperEventAssignment[] {
  return readAssignments().filter((a) => a.keeper_event_id === keeper_event_id);
}
