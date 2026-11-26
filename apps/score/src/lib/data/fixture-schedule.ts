import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  listCompetitions,
  type CompetitionListItem,
} from "@/lib/data/competition-rosters";
import { listAllDemoMatches, updateDemoMatch } from "@/lib/data/demo-match-store";
import { fetchSportNameMap, sportRefToSportId } from "@/lib/data/sport-ids";
import type { SportId } from "@/lib/utils/sport";
import {
  humanizePhase,
  isLockedStatus,
  isValidIso,
  rowKey,
  sortRowsByDate,
  type FixtureKind,
  type ScheduleRow,
} from "@/lib/schedule/shift-fixtures";

export type ScheduleHistoryBatch = {
  batch_id: string;
  created_at: string;
  reason: string;
  changed_by_name: string | null;
  count: number;
};

export type CompetitionSchedule = {
  rows: ScheduleRow[];
  history: ScheduleHistoryBatch[];
};

export type CompetitionScheduleSummary = {
  competition: CompetitionListItem;
  sport: SportId;
  fixture_count: number;
  next_kickoff: string | null;
  postponed_count: number;
  rescheduled_count: number;
};

export type RescheduleNote = {
  original_scheduled_at: string;
  latest_reason: string;
  changed_at: string;
  times_moved: number;
};

export type RescheduleChangeInput = {
  kind: FixtureKind;
  id: string;
  scheduled_at: string;
};

type LogRow = {
  batch_id: string;
  match_id: string | null;
  bracket_fixture_id: string | null;
  old_scheduled_at: string | null;
  reason: string;
  changed_by_name: string | null;
  created_at: string;
};

/**
 * Demo-mode log (session only, like the other demo overlays). Lives on
 * globalThis so API routes and pages share it in dev.
 */
type DemoLogRow = LogRow & { tournament_id: string };
const demoLogState = ((globalThis as typeof globalThis & {
  __auScoreDemoRescheduleLog?: { rows: DemoLogRow[] };
}).__auScoreDemoRescheduleLog ??= { rows: [] });

async function inDemo(): Promise<boolean> {
  return !hasSupabaseConfig() || (await getScoreDemoMode());
}

function logKey(r: Pick<LogRow, "match_id" | "bracket_fixture_id">): string | null {
  if (r.bracket_fixture_id) return rowKey("bracket", r.bracket_fixture_id);
  if (r.match_id) return rowKey("match", r.match_id);
  return null;
}

function summarizeLog(logs: LogRow[]) {
  const original = new Map<string, string | null>();
  const counts = new Map<string, number>();
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (const r of sorted) {
    const k = logKey(r);
    if (!k) continue;
    if (!original.has(k)) original.set(k, r.old_scheduled_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const batches = new Map<string, ScheduleHistoryBatch & { keys: Set<string> }>();
  for (const r of sorted) {
    const k = logKey(r);
    const b = batches.get(r.batch_id) ?? {
      batch_id: r.batch_id,
      created_at: r.created_at,
      reason: r.reason,
      changed_by_name: r.changed_by_name,
      count: 0,
      keys: new Set<string>(),
    };
    if (k) b.keys.add(k);
    b.count = b.keys.size;
    batches.set(r.batch_id, b);
  }
  const history = [...batches.values()]
    .map((b): ScheduleHistoryBatch => ({
      batch_id: b.batch_id,
      created_at: b.created_at,
      reason: b.reason,
      changed_by_name: b.changed_by_name,
      count: b.count,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { original, counts, history };
}

async function fetchLogs(tournamentIds: string[]): Promise<Array<LogRow & { tournament_id: string }>> {
  if (!tournamentIds.length) return [];
  if (await inDemo()) {
    return demoLogState.rows.filter((r) => tournamentIds.includes(r.tournament_id));
  }
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from("fixture_schedule_changes")
    .select(
      "tournament_id, batch_id, match_id, bracket_fixture_id, old_scheduled_at, reason, changed_by_name, created_at"
    )
    .in("tournament_id", tournamentIds)
    .order("created_at", { ascending: true })
    .limit(5000)) as {
    data: Array<LogRow & { tournament_id: string }> | null;
    error: { message: string } | null;
  };
  // Table missing (SQL not applied yet) or unreadable: behave as "no history".
  if (error) return [];
  return data ?? [];
}

function matchTitle(home?: string | null, away?: string | null): string {
  return `${home?.trim() || "TBD"} vs ${away?.trim() || "TBD"}`;
}

/** Every movable fixture for one competition, plus recent change batches. */
export async function listCompetitionSchedule(
  tournamentId: string
): Promise<CompetitionSchedule> {
  let rows: ScheduleRow[] = [];

  if (await inDemo()) {
    rows = listAllDemoMatches()
      .filter((m) => m.tournament_id === tournamentId && !m.deleted_at)
      .filter((m) => m.status !== "cancelled")
      .map((m) => ({
        key: rowKey("match", m.id),
        kind: "match" as const,
        id: m.id,
        title: matchTitle(m.home_team?.name, m.away_team?.name),
        phase: humanizePhase(m.competition_phase),
        status: m.status,
        scheduled_at: m.scheduled_at,
        venue_id: m.venue_id ?? null,
        venue_name: m.venue?.name ?? null,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        original_scheduled_at: null,
        reschedule_count: 0,
      }));
  } else {
    const supabase = await createClient();

    const { data: matchData } = (await supabase
      .from("matches")
      .select(
        "id, home_team_id, away_team_id, scheduled_at, status, competition_phase, venue_id, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name), venue:venues(name)"
      )
      .eq("tournament_id", tournamentId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true })) as {
      data: Array<{
        id: string;
        home_team_id: string | null;
        away_team_id: string | null;
        scheduled_at: string;
        status: string;
        competition_phase: string | null;
        venue_id: string | null;
        home_team: { name: string } | null;
        away_team: { name: string } | null;
        venue: { name: string } | null;
      }> | null;
    };

    const { data: bracketData } = (await supabase
      .from("bracket_fixtures")
      .select(
        "id, round_label, match_id, home_team_id, away_team_id, home_display_name, away_display_name, status, scheduled_at, sort_order"
      )
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true })) as {
      data: Array<{
        id: string;
        round_label: string;
        match_id: string | null;
        home_team_id: string | null;
        away_team_id: string | null;
        home_display_name: string | null;
        away_display_name: string | null;
        status: string;
        scheduled_at: string | null;
      }> | null;
    };

    // A bracket slot that already has a real match is moved through the slot
    // (the RPC keeps the match in step), so hide the duplicate match row.
    const linked = new Set(
      (bracketData ?? []).map((b) => b.match_id).filter((x): x is string => Boolean(x))
    );

    for (const m of matchData ?? []) {
      if (linked.has(m.id)) continue;
      rows.push({
        key: rowKey("match", m.id),
        kind: "match",
        id: m.id,
        title: matchTitle(m.home_team?.name, m.away_team?.name),
        phase: humanizePhase(m.competition_phase),
        status: m.status,
        scheduled_at: m.scheduled_at,
        venue_id: m.venue_id,
        venue_name: m.venue?.name ?? null,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        original_scheduled_at: null,
        reschedule_count: 0,
      });
    }

    for (const b of bracketData ?? []) {
      rows.push({
        key: rowKey("bracket", b.id),
        kind: "bracket",
        id: b.id,
        title: matchTitle(b.home_display_name, b.away_display_name),
        phase: b.round_label,
        status: b.status,
        scheduled_at: b.scheduled_at,
        venue_id: null,
        venue_name: null,
        home_team_id: b.home_team_id,
        away_team_id: b.away_team_id,
        original_scheduled_at: null,
        reschedule_count: 0,
      });
    }
  }

  const logs = await fetchLogs([tournamentId]);
  const { original, counts, history } = summarizeLog(logs);

  rows = sortRowsByDate(
    rows.map((r) => ({
      ...r,
      original_scheduled_at: original.get(r.key) ?? null,
      reschedule_count: counts.get(r.key) ?? 0,
    }))
  );

  return { rows, history: history.slice(0, 20) };
}

/** One card per competition for the /admin/fixtures picker. */
export async function listCompetitionScheduleSummaries(): Promise<
  CompetitionScheduleSummary[]
> {
  const competitions = await listCompetitions();
  if (!competitions.length) return [];
  const ids = competitions.map((c) => c.id);

  type Slim = { tournament_id: string; scheduled_at: string | null; status: string };
  let fixtures: Slim[] = [];

  if (await inDemo()) {
    fixtures = listAllDemoMatches()
      .filter((m) => !m.deleted_at && m.status !== "cancelled")
      .map((m) => ({
        tournament_id: m.tournament_id,
        scheduled_at: m.scheduled_at,
        status: m.status as string,
      }));
  } else {
    const supabase = await createClient();
    const { data: matchData } = (await supabase
      .from("matches")
      .select("id, tournament_id, scheduled_at, status")
      .in("tournament_id", ids)
      .is("deleted_at", null)
      .neq("status", "cancelled")) as {
      data: Array<Slim & { id: string }> | null;
    };
    const { data: bracketData } = (await supabase
      .from("bracket_fixtures")
      .select("tournament_id, scheduled_at, status, match_id")
      .in("tournament_id", ids)) as {
      data: Array<Slim & { match_id: string | null }> | null;
    };
    const linked = new Set(
      (bracketData ?? []).map((b) => b.match_id).filter((x): x is string => Boolean(x))
    );
    fixtures = [
      ...(matchData ?? []).filter((m) => !linked.has(m.id)),
      ...(bracketData ?? []),
    ];
  }

  const logs = await fetchLogs(ids);
  const movedByTournament = new Map<string, Set<string>>();
  for (const l of logs) {
    const k = logKey(l);
    if (!k) continue;
    const set = movedByTournament.get(l.tournament_id) ?? new Set<string>();
    set.add(k);
    movedByTournament.set(l.tournament_id, set);
  }

  const sportNames = (await inDemo())
    ? undefined
    : await fetchSportNameMap(await createClient());

  const now = Date.now();
  return competitions.map((competition) => {
    const mine = fixtures.filter((f) => f.tournament_id === competition.id);
    const upcoming = mine
      .filter(
        (f) =>
          !isLockedStatus("match", f.status) &&
          isValidIso(f.scheduled_at) &&
          new Date(f.scheduled_at).getTime() >= now
      )
      .map((f) => f.scheduled_at as string)
      .sort();
    return {
      competition,
      sport: sportRefToSportId(competition.sport_id, sportNames),
      fixture_count: mine.length,
      next_kickoff: upcoming[0] ?? null,
      postponed_count: mine.filter((f) => f.status === "postponed").length,
      rescheduled_count: movedByTournament.get(competition.id)?.size ?? 0,
    };
  });
}

export async function applyReschedule(input: {
  tournamentId: string;
  changes: RescheduleChangeInput[];
  reason: string;
  actorName?: string | null;
}): Promise<{ ok: true; changed: number; batch_id: string } | { error: string }> {
  const reason = input.reason.trim();
  if (!reason) return { error: "A reason is required" };
  if (!input.changes.length) return { error: "No changes supplied" };

  if (await inDemo()) {
    const batch_id = `demo-batch-${Date.now()}`;
    const created_at = new Date().toISOString();
    const before = new Map(
      listAllDemoMatches().map((m) => [m.id, m.scheduled_at] as const)
    );
    for (const c of input.changes) {
      if (c.kind !== "match") {
        return { error: "Knockout fixtures are not editable in demo mode" };
      }
      if (!before.has(c.id)) return { error: "Match not found" };
    }
    let changed = 0;
    for (const c of input.changes) {
      const updated = updateDemoMatch(c.id, {
        scheduled_at: c.scheduled_at,
        status: "scheduled",
        postpone_reason: null,
      });
      if (!updated) return { error: "Match not found" };
      demoLogState.rows = [
        ...demoLogState.rows,
        {
          tournament_id: input.tournamentId,
          batch_id,
          match_id: c.id,
          bracket_fixture_id: null,
          old_scheduled_at: before.get(c.id) ?? null,
          reason,
          changed_by_name: input.actorName ?? "Demo admin",
          created_at,
        },
      ];
      changed += 1;
    }
    return { ok: true, changed, batch_id };
  }

  const supabase = await createClient();
  const rpc = (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>
      ) => Promise<{
        data: { batch_id?: string; changed?: number } | null;
        error: { message: string } | null;
      }>;
    }
  ).rpc;
  const { data, error } = await rpc.call(supabase, "reschedule_fixtures", {
    p_changes: input.changes,
    p_reason: reason,
  });
  if (error) {
    if (/reschedule_fixtures/i.test(error.message) && /(find|exist|schema cache)/i.test(error.message)) {
      return {
        error:
          "Rescheduling is not set up in the database yet. Run supabase/score_fixture_reschedule_APPLY_ALL.sql first.",
      };
    }
    return { error: error.message };
  }
  return { ok: true, changed: data?.changed ?? 0, batch_id: data?.batch_id ?? "" };
}

/** Public "Rescheduled from ..." note for a single match page. */
export async function getRescheduleNote(matchId: string): Promise<RescheduleNote | null> {
  let rows: LogRow[] = [];
  if (await inDemo()) {
    rows = demoLogState.rows.filter((r) => r.match_id === matchId);
  } else {
    const supabase = await createClient();
    const { data, error } = (await supabase
      .from("fixture_schedule_changes")
      .select(
        "batch_id, match_id, bracket_fixture_id, old_scheduled_at, reason, changed_by_name, created_at"
      )
      .eq("match_id", matchId)
      .order("created_at", { ascending: true })) as {
      data: LogRow[] | null;
      error: { message: string } | null;
    };
    if (error) return null;
    rows = data ?? [];
  }

  const first = rows.find((r) => isValidIso(r.old_scheduled_at));
  const last = rows[rows.length - 1];
  if (!first || !last || !first.old_scheduled_at) return null;
  return {
    original_scheduled_at: first.old_scheduled_at,
    latest_reason: last.reason,
    changed_at: last.created_at,
    times_moved: rows.length,
  };
}
