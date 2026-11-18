import type { StatLeader } from "@/components/stats/stat-leader-card";
import {
  getStatCardsBySport,
  getStatLeadersBySport,
  type StatCard,
} from "@/lib/data/get-by-sport";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import {
  buildGoalkeeperStints,
  computeCleanSheets,
  type ConcededGoal,
  type SubstitutionEvent,
} from "@/lib/match/clean-sheets";
import type { SubmittedLineup } from "@/lib/data/demo-lineups";
import { createClient } from "@/lib/supabase/server";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import type { Player } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";
import { sportToDbId } from "@/lib/utils/sport";

export type StatLeadersBundle = {
  goals: StatLeader[];
  assists: StatLeader[];
  passes: StatLeader[];
  cleanSheets: StatLeader[];
};

type EventRow = {
  id: string;
  match_id: string;
  event_type: string;
  match_time: string | null;
  period: string | null;
  team_id: string | null;
  player_id: string | null;
  details: Record<string, unknown> | null;
  player: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    department_id: string | null;
    matric_number: string | null;
    position: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    department: { short_code: string | null } | null;
  } | null;
};

type LineupRow = {
  match_id: string;
  team_id: string;
  players: Array<{
    player_id: string;
    is_starting?: boolean;
    role?: string | null;
  }> | null;
  status: string | null;
};

type MatchSide = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number;
  away_score: number;
  status: string;
};

function parseMinute(matchTime: string | null | undefined): number {
  if (!matchTime) return 0;
  const n = parseInt(String(matchTime).replace(/\+.*/, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function toPlayer(row: NonNullable<EventRow["player"]>): Player {
  return {
    id: row.id,
    department_id: row.department_id ?? "unknown",
    first_name: row.first_name,
    last_name: row.last_name,
    matric_number: row.matric_number,
    avatar_url: row.avatar_url,
    position: row.position,
  };
}

function stubPlayer(id: string, name: string): Player {
  const parts = name.trim().split(/\s+/);
  return {
    id,
    department_id: "unknown",
    first_name: parts[0] || "Player",
    last_name: parts.slice(1).join(" "),
    matric_number: null,
    avatar_url: null,
    position: null,
  };
}

function bump(
  map: Map<string, { player: Player; teamName: string; teamCode: string; value: number }>,
  key: string,
  player: Player,
  teamName: string,
  teamCode: string,
  by = 1
) {
  const prev = map.get(key);
  if (prev) {
    prev.value += by;
    return;
  }
  map.set(key, { player, teamName, teamCode, value: by });
}

function toLeaders(
  map: Map<string, { player: Player; teamName: string; teamCode: string; value: number }>,
  limit: number
): StatLeader[] {
  return [...map.values()]
    .sort((a, b) => b.value - a.value || a.player.last_name.localeCompare(b.player.last_name))
    .slice(0, limit)
    .map((row) => ({
      player: row.player,
      teamName: row.teamName,
      teamCode: row.teamCode,
      value: row.value,
    }));
}

async function loadLiveLeaders(opts: {
  sport: SportId;
  tournamentId?: string | null;
  limit: number;
}): Promise<StatLeadersBundle> {
  const empty: StatLeadersBundle = {
    goals: [],
    assists: [],
    passes: [],
    cleanSheets: [],
  };

  if (opts.sport !== "football") {
    // Other sports: no event pipelines yet — never fall back to demo on hosted.
    return empty;
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, sportToDbId(opts.sport));
  if (typeof sportUuid !== "string") return empty;

  let matchQuery = supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, home_score, away_score, status, tournament:tournaments!inner(id, is_draft)")
    .eq("sport_id", sportUuid)
    .eq("status", "completed")
    .is("deleted_at", null)
    .eq("tournament.is_draft", false)
    .limit(500);

  if (opts.tournamentId) {
    matchQuery = matchQuery.eq("tournament_id", opts.tournamentId);
  }

  const { data: matches } = (await matchQuery) as { data: MatchSide[] | null };
  if (!matches?.length) return empty;

  const matchIds = matches.map((m) => m.id);
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const { data: events } = (await supabase
    .from("match_events")
    .select(
      "id, match_id, event_type, match_time, period, team_id, player_id, details, player:players(id, first_name, last_name, avatar_url, department_id, matric_number, position), team:teams(id, name, department:departments(short_code))"
    )
    .in("match_id", matchIds)
    .eq("is_void", false)) as { data: EventRow[] | null };

  const eventRows = events ?? [];

  const goalsMap = new Map<
    string,
    { player: Player; teamName: string; teamCode: string; value: number }
  >();
  const assistsMap = new Map<
    string,
    { player: Player; teamName: string; teamCode: string; value: number }
  >();

  const assistIds = new Set<string>();
  for (const e of eventRows) {
    if (e.period === "penalty_shootout") continue;
    if (e.event_type !== "goal" && e.event_type !== "penalty_scored") continue;
    const details = e.details ?? {};
    if (details.assist_pending === true || details.solo_goal === true) continue;
    const aid =
      typeof details.assist_player_id === "string" ? details.assist_player_id : null;
    if (aid) assistIds.add(aid);
  }

  const assistPlayerById = new Map<string, Player>();
  if (assistIds.size) {
    const { data: assistPlayers } = (await supabase
      .from("players")
      .select("id, first_name, last_name, avatar_url, department_id, matric_number, position")
      .in("id", [...assistIds])) as {
      data: Array<{
        id: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
        department_id: string | null;
        matric_number: string | null;
        position: string | null;
      }> | null;
    };
    for (const p of assistPlayers ?? []) {
      assistPlayerById.set(p.id, toPlayer(p));
    }
  }

  for (const e of eventRows) {
    if (e.period === "penalty_shootout") continue;
    const details = e.details ?? {};
    const teamName =
      e.team?.name ||
      (typeof details.team_name === "string" ? details.team_name : "Unknown");
    const teamCode = e.team?.department?.short_code || teamName.slice(0, 3).toUpperCase();

    if (
      (e.event_type === "goal" || e.event_type === "penalty_scored") &&
      e.player_id
    ) {
      const player =
        e.player != null
          ? toPlayer(e.player)
          : stubPlayer(
              e.player_id,
              typeof details.player_name === "string" ? details.player_name : "Player"
            );
      bump(goalsMap, e.player_id, player, teamName, teamCode);
    }

    if (
      (e.event_type === "goal" || e.event_type === "penalty_scored") &&
      details.assist_pending !== true &&
      details.solo_goal !== true
    ) {
      const aid =
        typeof details.assist_player_id === "string" ? details.assist_player_id : null;
      if (aid) {
        const aName =
          typeof details.assist_player_name === "string"
            ? details.assist_player_name
            : "Assister";
        const player = assistPlayerById.get(aid) ?? stubPlayer(aid, aName);
        bump(assistsMap, aid, player, teamName, teamCode);
      }
    }
  }

  // Clean sheets from lineups + conceded goals
  const { data: lineupRows } = (await supabase
    .from("match_lineups")
    .select("match_id, team_id, players, status")
    .in("match_id", matchIds)) as { data: LineupRow[] | null };

  const csMap = new Map<
    string,
    { player: Player; teamName: string; teamCode: string; value: number }
  >();

  const eventsByMatch = new Map<string, EventRow[]>();
  for (const e of eventRows) {
    const list = eventsByMatch.get(e.match_id) ?? [];
    list.push(e);
    eventsByMatch.set(e.match_id, list);
  }

  const gkPlayerIds = new Set<string>();
  for (const row of lineupRows ?? []) {
    for (const p of row.players ?? []) {
      if (String(p.role ?? "").toUpperCase() === "GK") gkPlayerIds.add(p.player_id);
    }
  }

  const gkById = new Map<string, Player>();
  const gkTeamMeta = new Map<string, { teamName: string; teamCode: string }>();
  if (gkPlayerIds.size) {
    const { data: gkPlayers } = (await supabase
      .from("players")
      .select("id, first_name, last_name, avatar_url, department_id, matric_number, position")
      .in("id", [...gkPlayerIds])) as {
      data: Array<{
        id: string;
        first_name: string;
        last_name: string;
        avatar_url: string | null;
        department_id: string | null;
        matric_number: string | null;
        position: string | null;
      }> | null;
    };
    for (const p of gkPlayers ?? []) gkById.set(p.id, toPlayer(p));
  }

  // Team names for CS attribution
  const teamIds = [
    ...new Set(
      matches.flatMap((m) => [m.home_team_id, m.away_team_id].filter(Boolean) as string[])
    ),
  ];
  const teamMeta = new Map<string, { name: string; code: string }>();
  if (teamIds.length) {
    const { data: teams } = (await supabase
      .from("teams")
      .select("id, name, department:departments(short_code)")
      .in("id", teamIds)) as {
      data: Array<{
        id: string;
        name: string;
        department: { short_code: string | null } | null;
      }> | null;
    };
    for (const t of teams ?? []) {
      teamMeta.set(t.id, {
        name: t.name,
        code: t.department?.short_code || t.name.slice(0, 3).toUpperCase(),
      });
    }
  }

  for (const row of lineupRows ?? []) {
    const match = matchById.get(row.match_id);
    if (!match) continue;
    const lineup: SubmittedLineup = {
      match_id: row.match_id,
      team_id: row.team_id,
      players: (row.players ?? []).map((p) => ({
        player_id: p.player_id,
        is_starting: Boolean(p.is_starting),
        role: p.role,
      })),
      submitted_at: "",
      status: (row.status as SubmittedLineup["status"]) ?? "confirmed",
    };

    const matchEvents = eventsByMatch.get(row.match_id) ?? [];
    const subs: SubstitutionEvent[] = matchEvents
      .filter((e) => e.event_type === "substitution")
      .map((e) => {
        const d = e.details ?? {};
        return {
          minute: parseMinute(e.match_time),
          player_in_id:
            typeof d.player_in_id === "string"
              ? d.player_in_id
              : typeof d.in_player_id === "string"
                ? d.in_player_id
                : null,
          player_out_id:
            typeof d.player_out_id === "string"
              ? d.player_out_id
              : e.player_id,
        };
      });

    const opposingTeamId =
      row.team_id === match.home_team_id ? match.away_team_id : match.home_team_id;
    const conceded: ConcededGoal[] = matchEvents
      .filter((e) => {
        if (e.period === "penalty_shootout") return false;
        if (e.event_type === "goal" || e.event_type === "penalty_scored") {
          return e.team_id === opposingTeamId;
        }
        if (e.event_type === "own_goal") {
          return e.team_id === row.team_id;
        }
        return false;
      })
      .map((e) => ({ minute: parseMinute(e.match_time) }));

    // Score-only fallback: if no goal events but side conceded via scoreline
    if (
      conceded.length === 0 &&
      match.home_score + match.away_score > 0
    ) {
      const goalsAgainst =
        row.team_id === match.home_team_id ? match.away_score : match.home_score;
      for (let i = 0; i < goalsAgainst; i++) {
        conceded.push({ minute: 45 });
      }
    }

    const stints = buildGoalkeeperStints(lineup, subs);
    const results = computeCleanSheets(
      { status: "completed" },
      stints,
      conceded
    );
    const meta = teamMeta.get(row.team_id) ?? { name: "Unknown", code: "???" };
    for (const r of results) {
      if (!r.clean_sheet) continue;
      const player = gkById.get(r.player_id) ?? stubPlayer(r.player_id, "GK");
      bump(csMap, r.player_id, player, meta.name, meta.code);
      gkTeamMeta.set(r.player_id, { teamName: meta.name, teamCode: meta.code });
    }
  }

  void gkTeamMeta;

  return {
    goals: toLeaders(goalsMap, opts.limit),
    assists: toLeaders(assistsMap, opts.limit),
    passes: [],
    cleanSheets: toLeaders(csMap, opts.limit),
  };
}

/** Hosted Score always aggregates live; local-only (no Supabase) keeps demo leaders. */
export async function fetchStatLeaders(opts: {
  sport: SportId;
  tournamentId?: string | null;
  limit?: number;
}): Promise<StatLeadersBundle> {
  const limit = opts.limit ?? 5;
  if (!hasSupabaseConfig()) {
    return getStatLeadersBySport(opts.sport);
  }
  return loadLiveLeaders({ ...opts, limit });
}

export async function fetchStatCards(opts: {
  sport: SportId;
  tournamentId?: string | null;
  mode?: "default" | "advanced";
  limit?: number;
}): Promise<StatCard[]> {
  if (!hasSupabaseConfig()) {
    return getStatCardsBySport(opts.sport, opts.mode ?? "default");
  }

  const leaders = await fetchStatLeaders({
    sport: opts.sport,
    tournamentId: opts.tournamentId,
    limit: opts.limit ?? 5,
  });

  if (opts.sport === "football") {
    return [
      { title: "Goals", leaders: leaders.goals, statIndex: 0 },
      { title: "Assists", leaders: leaders.assists, statIndex: 1 },
      { title: "Clean Sheets", leaders: leaders.cleanSheets, statIndex: 3 },
    ];
  }

  // Other sports: empty live cards (same labels as demo, no fake names)
  return getStatCardsBySport(opts.sport, opts.mode ?? "default").map((card) => ({
    ...card,
    leaders: [],
  }));
}
