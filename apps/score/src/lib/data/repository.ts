import type {
  BracketFixture,
  GroupStandingRow,
  Match,
  MatchScope,
  MeetEventFixture,
  PeriodScore,
  Player,
  SetScore,
  StandingRow,
  Team,
  Tournament,
  TrackResult,
  Venue,
} from "@/lib/types/database";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import type { SquadPlayer } from "@/lib/data/demo-squads";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import {
  getBracketFixturesForSport,
  getGroupStandingsForSport,
  getMeetEventsForSport,
  getTournamentForSport,
  getTournamentsForSport,
} from "@/lib/data/demo-competition";
import { buildNextMatchMapFromFixtures } from "@/lib/standings/next-match";
import {
  getCreatedDemoTournament,
  nextMatchday,
  registerDemoTournament,
} from "@/lib/data/demo-competitions-store";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import {
  getDemoMatchById,
  listAllDemoMatches,
  postDemoMatch,
  softDeleteDemoMatch,
  updateDemoMatch,
} from "@/lib/data/demo-match-store";
import {
  addGuestTeam,
  listGuestTeams,
  removeGuestTeam,
  type CreateGuestTeamInput,
} from "@/lib/data/demo-guest-teams";
import {
  createDemoVenue,
  getDemoVenueById,
  listDemoVenues,
  softDeleteDemoVenue,
  updateDemoVenue,
} from "@/lib/data/venues";
import {
  getEventsForMatch,
  getPeriodScoresForMatch,
  getSetScoresForMatch,
  getTrackResultsForMatch,
} from "@/lib/data/demo-match-details";
import type { SeasonAward } from "@/lib/data/demo-awards";
import { getAwardsForSport } from "@/lib/data/demo-awards";
import { getSquadForTeam } from "@/lib/data/demo-squads";
import { createClient } from "@/lib/supabase/server";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

type TournamentRow = {
  id: string;
  name: string;
  sport_id: string;
  category: string;
  season: string;
  rules: Record<string, unknown>;
  format?: string;
  phases?: Tournament["phases"];
  competition_type?: string | null;
  is_draft?: boolean | null;
  title_holder_team_id?: string | null;
  title_holder_name?: string | null;
  title_holder_season?: string | null;
  config?: Record<string, unknown> | null;
};

function mapTournamentRow(data: TournamentRow): Tournament {
  return {
    id: data.id,
    name: data.name,
    sport_id: data.sport_id,
    category: data.category as Tournament["category"],
    format: data.format as Tournament["format"],
    competition_type: (data.competition_type as Tournament["competition_type"]) ?? undefined,
    rules: (data.rules ?? {}) as Tournament["rules"],
    season: data.season,
    phases: data.phases,
    is_draft: Boolean(data.is_draft),
    config: data.config ?? null,
    title_holder: data.title_holder_name
      ? {
          team_id: data.title_holder_team_id,
          team_name: data.title_holder_name,
          season: data.title_holder_season ?? "Previous",
        }
      : null,
  };
}

type BracketRow = {
  id: string;
  round: string;
  round_label: string;
  match_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_display_name: string | null;
  away_display_name: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string;
  scheduled_at: string | null;
  home_player_id: string | null;
  away_player_id: string | null;
  home_subtitle: string | null;
  away_subtitle: string | null;
  home_avatar_url: string | null;
  away_avatar_url: string | null;
  bracket_mode: string;
};

type MeetEventRow = {
  id: string;
  event_name: string;
  category: string;
  match_id: string | null;
  status: string;
  scheduled_at: string | null;
  venue: string | null;
};

/** Published (non-draft) competitions for a sport — Live mode only returns real rows. */
export async function fetchTournamentsForSport(sportDbId: string): Promise<Tournament[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return getTournamentsForSport(sportDbId);
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, sportDbId);
  if (typeof sportUuid !== "string") return [];

  const { data } = (await supabase
    .from("tournaments")
    .select("*")
    .eq("sport_id", sportUuid)
    .eq("is_draft", false)
    .neq("category", "friendly")
    .order("created_at", { ascending: false })) as { data: TournamentRow[] | null };

  return (data ?? []).map(mapTournamentRow);
}

/** All published competitions across sports (Competitions hub). */
export async function fetchPublicCompetitions(): Promise<Tournament[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return (
      [
        "sport-football",
        "sport-basketball",
        "sport-volleyball",
        "sport-tennis",
        "sport-track",
      ] as const
    ).flatMap((s) => getTournamentsForSport(s));
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("tournaments")
    .select("*")
    .eq("is_draft", false)
    .neq("category", "friendly")
    .order("created_at", { ascending: false })) as { data: TournamentRow[] | null };

  return (data ?? []).map(mapTournamentRow);
}

export async function fetchTournamentForSport(
  sportDbId: string,
  tournamentId?: string
): Promise<Tournament | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return getTournamentForSport(sportDbId, tournamentId);
  }

  const all = await fetchTournamentsForSport(sportDbId);
  if (tournamentId) return all.find((t) => t.id === tournamentId) ?? null;
  return all[0] ?? null;
}

export async function fetchGroupStandings(
  sportDbId: string,
  tournamentId?: string
): Promise<GroupStandingRow[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getGroupStandingsForSport(sportDbId);

  const tournament = await fetchTournamentForSport(sportDbId, tournamentId);
  if (!tournament) return [];

  const supabase = await createClient();

  const { data: teamRows } = (await supabase
    .from("tournament_teams")
    .select("team_id, team:teams(id, name, logo_url, department:departments(short_code))")
    .eq("tournament_id", tournament.id)) as {
    data: Array<{
      team_id: string;
      team:
        | {
            id: string;
            name: string;
            logo_url: string | null;
            department: { short_code: string } | { short_code: string }[] | null;
          }
        | null;
    }> | null;
  };

  const { data: matches } = (await supabase
    .from("matches")
    .select(
      "*, home_team:teams!home_team_id(*, department:departments(*)), away_team:teams!away_team_id(*, department:departments(*))"
    )
    .eq("tournament_id", tournament.id)
    .is("deleted_at", null)) as { data: Match[] | null };

  if (!teamRows?.length) return [];

  const { recomputeStandingsFromMatches } = await import("@/lib/competition/standings");
  const teams = teamRows.map((r) => {
    const dept = Array.isArray(r.team?.department)
      ? r.team?.department[0]
      : r.team?.department;
    return {
      id: r.team_id,
      name: r.team?.name ?? "Unknown",
      short_code: dept?.short_code ?? null,
      logo_url: r.team?.logo_url ?? null,
    };
  });

  const completed = (matches ?? []).filter((m) => m.status === "completed");
  const table = recomputeStandingsFromMatches(completed, teams);
  const nextByTeam = buildNextMatchMapFromFixtures(matches ?? []);

  return table.map((row) => ({
    ...row,
    next_match: nextByTeam.get(row.team_id) ?? null,
    group_id: tournament.id,
    group_name: tournament.name,
  }));
}

/** League table rows for Table / Competition pages. */
export async function fetchLeagueStandings(
  sportDbId: string,
  tournamentId?: string
): Promise<StandingRow[]> {
  const rows = await fetchGroupStandings(sportDbId, tournamentId);
  return rows.map(({ group_id: _g, group_name: _n, ...row }) => row);
}

export async function fetchBracketFixtures(
  sportDbId: string,
  tournamentId?: string
): Promise<BracketFixture[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getBracketFixturesForSport(sportDbId);

  const tournament = await fetchTournamentForSport(sportDbId, tournamentId);
  if (!tournament) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("bracket_fixtures")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order") as { data: BracketRow[] | null };

  if (!data?.length) return [];

  return data.map((row) => ({
    id: row.id,
    round: row.round as BracketFixture["round"],
    round_label: row.round_label,
    match_id: row.match_id,
    home_team_id: row.home_team_id,
    away_team_id: row.away_team_id,
    home_team_name: row.home_display_name,
    away_team_name: row.away_display_name,
    home_score: row.home_score,
    away_score: row.away_score,
    home_penalties: row.home_penalties,
    away_penalties: row.away_penalties,
    status: row.status as BracketFixture["status"],
    scheduled_at: row.scheduled_at,
    home_player_id: row.home_player_id,
    away_player_id: row.away_player_id,
    home_subtitle: row.home_subtitle,
    away_subtitle: row.away_subtitle,
    home_avatar_url: row.home_avatar_url,
    away_avatar_url: row.away_avatar_url,
    bracket_mode: row.bracket_mode as BracketFixture["bracket_mode"],
  }));
}

export async function fetchMeetEvents(
  sportDbId: string,
  tournamentId?: string
): Promise<MeetEventFixture[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getMeetEventsForSport(sportDbId);

  const tournament = await fetchTournamentForSport(sportDbId, tournamentId);
  if (!tournament) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("meet_events")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order") as { data: MeetEventRow[] | null };

  if (!data?.length) return [];

  return data.map((row) => ({
    id: row.id,
    event_name: row.event_name,
    category: row.category,
    match_id: row.match_id,
    status: row.status as MeetEventFixture["status"],
    scheduled_at: row.scheduled_at,
    venue: row.venue,
  }));
}

export async function fetchMatchById(id: string): Promise<Match | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getDemoMatchById(id);

  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("*, venue:venues(*), home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), tournament:tournaments(*)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle() as { data: Match | null };

  return (data as unknown as Match) ?? null;
}

/** Admin/keeper match list from live DB (never falls back to demo theatre). */
export async function listMatchesForAdmin(limit = 200): Promise<Match[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listAllDemoMatches().filter((m) => !m.deleted_at).slice(0, limit);
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("matches")
    .select(
      "*, venue:venues(*), home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), tournament:tournaments(*)"
    )
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false })
    .limit(limit)) as { data: Match[] | null };

  return (data ?? []) as Match[];
}

export async function fetchMatchesForHeadToHead(
  sportDbId: string,
  teamAId: string,
  teamBId: string
): Promise<Match[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listAllDemoMatches().filter(
      (m) =>
        m.sport_id === sportDbId &&
        m.status === "completed" &&
        !m.deleted_at &&
        [m.home_team_id, m.away_team_id].includes(teamAId) &&
        [m.home_team_id, m.away_team_id].includes(teamBId)
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), tournament:tournaments(*)")
    .eq("sport_id", sportDbId)
    .eq("status", "completed")
    .is("deleted_at", null)
    .or(
      `and(home_team_id.eq.${teamAId},away_team_id.eq.${teamBId}),and(home_team_id.eq.${teamBId},away_team_id.eq.${teamAId})`
    )
    .order("scheduled_at", { ascending: false }) as { data: Match[] | null };

  return (data ?? []) as Match[];
}

export async function fetchMatchEvents(matchId: string): Promise<DemoMatchEvent[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getEventsForMatch(matchId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .eq("is_void", false)
    .order("created_at", { ascending: false }) as {
    data: Array<{
      id: string;
      match_id: string;
      event_type: string;
      match_time: string;
      period: string;
      details: Record<string, unknown> | null;
      team_id: string | null;
      player_id: string | null;
    }> | null;
  };

  if (!data?.length) return [];

  return data.map((row) => {
    const details = row.details ?? {};
    const fullName =
      typeof details.player_name === "string" ? details.player_name : "";
    const [first = "", ...rest] = fullName.split(" ");
    return {
      id: row.id,
      match_id: row.match_id,
      player: {
        id: row.player_id ?? "",
        department_id: "unknown",
        first_name: first,
        last_name: rest.join(" "),
        matric_number: null,
        avatar_url: null,
        position: null,
      },
      team_id: row.team_id ?? "",
      team_name: typeof details.team_name === "string" ? details.team_name : "",
      team_code: typeof details.team_code === "string" ? details.team_code : "",
      team_logo_url: null,
      event_type: row.event_type,
      match_time: row.match_time,
      period: row.period,
      details: row.details,
    };
  });
}

export async function fetchPeriodScores(matchId: string): Promise<PeriodScore[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getPeriodScoresForMatch(matchId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("period_scores")
    .select("*")
    .eq("match_id", matchId)
    .order("sort_order") as {
    data: Array<{ period: string; label: string; home_score: number; away_score: number }> | null;
  };

  if (!data?.length) return [];
  return data.map((r) => ({
    period: r.period,
    label: r.label,
    home_score: r.home_score,
    away_score: r.away_score,
  }));
}

export async function fetchSetScores(matchId: string): Promise<SetScore[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getSetScoresForMatch(matchId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("set_scores")
    .select("*")
    .eq("match_id", matchId)
    .order("set_number") as {
    data: Array<{ set_number: number; home_games: number; away_games: number; tiebreak: boolean | null }> | null;
  };

  if (!data?.length) return [];
  return data.map((r) => ({
    set_number: r.set_number,
    home_games: r.home_games,
    away_games: r.away_games,
    tiebreak: r.tiebreak ?? false,
  }));
}

export async function fetchTrackResults(matchId: string): Promise<TrackResult[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getTrackResultsForMatch(matchId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("track_results")
    .select("*")
    .eq("match_id", matchId)
    .order("finish_rank") as {
    data: Array<{
      finish_rank: number | null;
      lane_number: number | null;
      finish_time_ms: number | null;
      player_id: string;
    }> | null;
  };

  if (!data?.length) return [];

  return data.map((r, i) => ({
    rank: r.finish_rank ?? i + 1,
    lane: r.lane_number ?? 0,
    player_id: r.player_id,
    athlete_name: "",
    department_code: "",
    time_ms: r.finish_time_ms ?? 0,
    time_display: r.finish_time_ms ? (r.finish_time_ms / 1000).toFixed(2) : "—",
    avatar_url: null,
  }));
}

export async function fetchSquadForTeam(teamId: string, sportId: string): Promise<SquadPlayer[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getSquadForTeam(teamId, sportId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("player_sport_registry")
    .select("jersey_number, squad_role, player_id, player:players(*)")
    .eq("team_id", teamId)
    .eq("is_active", true) as {
    data: Array<{
      jersey_number: number | null;
      squad_role: string | null;
      player_id: string;
      player: Player | Player[] | null;
    }> | null;
  };

  if (!data?.length) return [];

  const squad: SquadPlayer[] = [];
  for (const row of data) {
    const joined = Array.isArray(row.player) ? row.player[0] : row.player;
    if (!joined) continue;
    squad.push({
      ...joined,
      jersey_number: row.jersey_number ?? undefined,
      squad_role: row.squad_role ?? joined.position ?? "Squad",
    });
  }
  return squad;
}

export interface CreateMatchEventInput {
  match_id: string;
  team_id?: string | null;
  player_id?: string | null;
  event_type: string;
  period: string;
  match_time: string;
  details?: Record<string, unknown>;
}

const FOOTBALL_SCORE_EVENTS = new Set(["goal", "penalty_scored", "own_goal"]);
const BASKETBALL_SCORE_EVENTS = new Set(["two_pointer", "field_goal", "free_throw"]);

function eventAffectsScore(eventType: string): boolean {
  return FOOTBALL_SCORE_EVENTS.has(eventType) || BASKETBALL_SCORE_EVENTS.has(eventType);
}

export async function createMatchEvent(input: CreateMatchEventInput): Promise<{ id: string } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    // Demo: events stay in the keeper localStorage; return a stable client-ish id.
    return { id: `evt-demo-${Date.now().toString(36)}` };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("match_events") as ReturnType<typeof supabase.from>).insert({
    match_id: input.match_id,
    team_id: input.team_id ?? null,
    player_id: input.player_id ?? null,
    event_type: input.event_type,
    period: input.period,
    match_time: input.match_time,
    details: input.details ?? {},
  } as Record<string, unknown>).select("id").single() as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "No event created" };

  // Keep the match scoreboard in sync so the public page shows live goals.
  if (eventAffectsScore(input.event_type) || input.event_type === "disallowed_goal" || input.event_type === "disallowed") {
    await recomputeMatchScoreFromEvents(input.match_id);
  }

  return { id: data.id };
}

export interface UpdateMatchEventInput {
  match_id: string;
  event_id: string;
  /** Soft-delete / VAR cancel — excluded from score + public feed. */
  is_void?: boolean;
  match_time?: string;
  period?: string;
  team_id?: string | null;
  player_id?: string | null;
  event_type?: string;
  details?: Record<string, unknown>;
}

export async function updateMatchEvent(
  input: UpdateMatchEventInput
): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { ok: true };
  }

  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (input.is_void != null) patch.is_void = input.is_void;
  if (input.match_time != null) patch.match_time = input.match_time;
  if (input.period != null) patch.period = input.period;
  if (input.team_id !== undefined) patch.team_id = input.team_id;
  if (input.player_id !== undefined) patch.player_id = input.player_id;
  if (input.event_type != null) patch.event_type = input.event_type;
  if (input.details != null) patch.details = input.details;

  if (Object.keys(patch).length === 0) return { error: "No fields to update" };

  const { data, error } = (await (supabase.from("match_events") as ReturnType<typeof supabase.from>)
    .update(patch)
    .eq("id", input.event_id)
    .eq("match_id", input.match_id)
    .select("id, event_type")
    .maybeSingle()) as {
    data: { id: string; event_type: string } | null;
    error: { message: string } | null;
  };

  if (error) return { error: error.message };
  if (!data) return { error: "Event not found" };

  if (eventAffectsScore(data.event_type) || input.is_void != null || input.details != null) {
    await recomputeMatchScoreFromEvents(input.match_id);
  }

  return { ok: true };
}

export async function voidMatchEvent(
  matchId: string,
  eventId: string
): Promise<{ ok: true } | { error: string }> {
  return updateMatchEvent({ match_id: matchId, event_id: eventId, is_void: true });
}

async function recomputeMatchScoreFromEvents(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { data: match } = (await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, sport:sports(name)")
    .eq("id", matchId)
    .maybeSingle()) as {
    data: {
      id: string;
      home_team_id: string | null;
      away_team_id: string | null;
      sport?: { name?: string } | { name?: string }[] | null;
    } | null;
  };
  if (!match) return;

  const sportJoin = match.sport;
  const sportName = (Array.isArray(sportJoin) ? sportJoin[0]?.name : sportJoin?.name)?.toLowerCase();

  const { data: events } = (await supabase
    .from("match_events")
    .select("event_type, team_id, period, is_void")
    .eq("match_id", matchId)
    .eq("is_void", false)) as {
    data: Array<{
      event_type: string;
      team_id: string | null;
      period: string | null;
      is_void: boolean;
    }> | null;
  };

  let home = 0;
  let away = 0;

  for (const e of events ?? []) {
    // Shootout pens are tracked on home_penalties / away_penalties — never inflate FT.
    if (e.period === "penalty_shootout") continue;

    if (sportName === "basketball" || BASKETBALL_SCORE_EVENTS.has(e.event_type)) {
      let pts = 0;
      if (e.event_type === "two_pointer") pts = 2;
      else if (e.event_type === "field_goal") pts = 3;
      else if (e.event_type === "free_throw") pts = 1;
      else if (!FOOTBALL_SCORE_EVENTS.has(e.event_type)) continue;
      if (pts > 0) {
        if (e.team_id === match.home_team_id) home += pts;
        else if (e.team_id === match.away_team_id) away += pts;
        continue;
      }
    }

    if (!FOOTBALL_SCORE_EVENTS.has(e.event_type)) continue;

    if (e.event_type === "own_goal") {
      // Credit the opposing side.
      if (e.team_id === match.home_team_id) away += 1;
      else if (e.team_id === match.away_team_id) home += 1;
      continue;
    }
    if (e.team_id === match.home_team_id) home += 1;
    else if (e.team_id === match.away_team_id) away += 1;
  }

  await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .update({ home_score: home, away_score: away } as Record<string, unknown>)
    .eq("id", matchId);
}

/** Public fixture list for Matches home + Live page. */
export async function fetchPublicMatches(opts?: {
  sportDbId?: string;
  status?: Array<"scheduled" | "live" | "paused" | "completed">;
  limit?: number;
}): Promise<Match[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    let rows = listAllDemoMatches()
      .filter((m) => !m.deleted_at)
      .filter((m) => !m.tournament?.is_draft);
    if (opts?.sportDbId) rows = rows.filter((m) => m.sport_id === opts.sportDbId);
    if (opts?.status?.length) rows = rows.filter((m) => opts.status!.includes(m.status as "scheduled" | "live" | "paused" | "completed"));
    return rows.slice(0, opts?.limit ?? 100);
  }

  const supabase = await createClient();
  let query = supabase
    .from("matches")
    .select(
      "*, venue:venues(*), home_team:teams!home_team_id(*, department:departments(*)), away_team:teams!away_team_id(*, department:departments(*)), tournament:tournaments!inner(*)"
    )
    .is("deleted_at", null)
    .eq("tournament.is_draft", false)
    .order("scheduled_at", { ascending: true })
    .limit(opts?.limit ?? 100);

  if (opts?.sportDbId) {
    const sportUuid = await resolveSportUuid(supabase, opts.sportDbId);
    if (typeof sportUuid === "string") query = query.eq("sport_id", sportUuid);
  }
  if (opts?.status?.length) {
    query = query.in("status", opts.status);
  }

  const { data } = (await query) as { data: Match[] | null };
  return (data ?? []) as Match[];
}

type SeasonAwardRow = {
  id: string;
  sport_id: string;
  award_type: string;
  season: string;
  week_number: number | null;
  player_id: string | null;
  team_id: string | null;
  display_label: string | null;
  stat_value: number | null;
  lineup: SeasonAward["lineup"] | null;
  published_at: string | null;
  metadata: { player_name?: string; team_name?: string; label?: string } | null;
  published: boolean;
};

function mapSeasonAwardRow(row: SeasonAwardRow): SeasonAward {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    award_type: row.award_type as SeasonAward["award_type"],
    season: row.season,
    sport_id: row.sport_id,
    week_number: row.week_number,
    player_id: row.player_id,
    team_id: row.team_id,
    player_name: meta.player_name ?? null,
    team_name: meta.team_name ?? null,
    value: row.stat_value,
    label: row.display_label ?? meta.label ?? null,
    lineup: row.lineup ?? null,
    published: row.published,
    published_at: row.published_at,
  };
}

export async function fetchSeasonAwards(sportDbId: string, season = "2025/26"): Promise<SeasonAward[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getAwardsForSport(sportDbId);

  const supabase = await createClient();
  const { data } = await supabase
    .from("season_awards")
    .select("*")
    .eq("sport_id", sportDbId)
    .eq("season", season)
    .eq("published", true)
    .order("award_type") as { data: SeasonAwardRow[] | null };

  if (!data?.length) return [];
  return data.map(mapSeasonAwardRow);
}

export interface UpsertSeasonAwardInput {
  sport_id: string;
  award_type: SeasonAward["award_type"];
  season?: string;
  week_number?: number | null;
  player_id?: string | null;
  team_id?: string | null;
  player_name?: string | null;
  team_name?: string | null;
  value?: number | string | null;
  label?: string | null;
  lineup?: SeasonAward["lineup"];
  published?: boolean;
}

export async function upsertSeasonAward(input: UpsertSeasonAwardInput): Promise<{ id: string } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { error: "Demo mode: awards saved via admin localStorage" };
  }

  const supabase = await createClient();
  const season = input.season ?? "2025/26";
  const payload = {
    sport_id: input.sport_id,
    award_type: input.award_type,
    season,
    week_number: input.week_number ?? null,
    player_id: input.player_id ?? null,
    team_id: input.team_id ?? null,
    display_label: input.label ?? null,
    stat_value: input.value != null && input.value !== "" ? Number(input.value) : null,
    lineup: input.lineup ?? [],
    published_at: new Date().toISOString(),
    metadata: {
      player_name: input.player_name ?? undefined,
      team_name: input.team_name ?? undefined,
      label: input.label ?? undefined,
    },
    published: input.published ?? true,
  };

  const query = supabase
    .from("season_awards")
    .select("id")
    .eq("sport_id", input.sport_id)
    .eq("season", season)
    .eq("award_type", input.award_type);

  if (input.award_type === "team_of_week" && input.week_number != null) {
    query.eq("week_number", input.week_number);
  }

  const { data: existing } = await query.maybeSingle() as { data: { id: string } | null };

  if (existing?.id) {
    const { data, error } = await (supabase.from("season_awards") as ReturnType<typeof supabase.from>)
      .update(payload as Record<string, unknown>)
      .eq("id", existing.id)
      .select("id")
      .single() as { data: { id: string } | null; error: { message: string } | null };
    if (error) return { error: error.message };
    if (!data) return { error: "Award not updated" };
    return { id: data.id };
  }

  const { data, error } = await (supabase.from("season_awards") as ReturnType<typeof supabase.from>)
    .insert(payload as Record<string, unknown>)
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Award not created" };
  return { id: data.id };
}

export interface CreateMatchInput {
  sport_id: string;
  home_team_id: string;
  away_team_id: string;
  status: "scheduled" | "completed";
  scheduled_at: string;
  home_score: number;
  away_score: number;
  home_penalties?: number | null;
  away_penalties?: number | null;
  scope?: MatchScope;
  venue_id?: string | null;
  tournament_id?: string | null;
  set_scores?: Array<{ set_number: number; home_games: number; away_games: number }>;
  /** Optional pre-match lineup graphic URL (simple sheet photo). */
  lineup_image_url?: string | null;
  allows_extra_time?: boolean;
  allows_penalty_shootout?: boolean;
}

async function resolveFriendlyTournamentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sportId: string
): Promise<string | { error: string }> {
  const { data: existing } = await supabase
    .from("tournaments")
    .select("id")
    .eq("sport_id", sportId)
    .eq("category", "friendly")
    .eq("name", "Friendlies")
    .maybeSingle() as { data: { id: string } | null };

  if (existing?.id) return existing.id;

  const { data: created, error } = await (supabase.from("tournaments") as ReturnType<typeof supabase.from>)
    .insert({
      name: "Friendlies",
      sport_id: sportId,
      category: "friendly",
      season: "2025/26",
      rules: {},
    } as Record<string, unknown>)
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!created) return { error: "Could not create Friendlies tournament" };
  return created.id;
}

/**
 * Creates a one-off match — used by admin/keeper "Post a Result" for
 * friendlies (including guest-team fixtures) posted without a live keeper.
 */
export async function createMatch(input: CreateMatchInput): Promise<{ id: string } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const created = getCreatedDemoTournament(input.tournament_id ?? "");
    const match = postDemoMatch({
      ...input,
      tournament: created ?? undefined,
      scope: input.tournament_id ? (input.scope ?? "official") : input.scope,
    });
    return { id: match.id };
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, input.sport_id);
  if (typeof sportUuid !== "string") return sportUuid;

  const tournamentId =
    input.tournament_id ?? (await resolveFriendlyTournamentId(supabase, sportUuid));
  if (typeof tournamentId === "object") return tournamentId;

  const decidedOnPens =
    input.home_penalties != null &&
    input.away_penalties != null &&
    input.status === "completed";

  const scope = input.tournament_id
    ? (input.scope ?? "official")
    : (input.scope ?? "pickup");

  const { data, error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .insert({
      tournament_id: tournamentId,
      sport_id: sportUuid,
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      status: input.status,
      current_period: decidedOnPens
        ? "penalty_shootout"
        : input.status === "completed"
          ? "full_time"
          : "not_started",
      home_score: input.home_score,
      away_score: input.away_score,
      home_penalties: input.home_penalties ?? null,
      away_penalties: input.away_penalties ?? null,
      scheduled_at: input.scheduled_at,
      started_at: input.status === "completed" ? input.scheduled_at : null,
      ended_at: input.status === "completed" ? new Date().toISOString() : null,
      scope,
      venue_id: input.venue_id ?? null,
      lineup_image_url: input.lineup_image_url ?? null,
      allows_extra_time: Boolean(input.allows_extra_time),
      allows_penalty_shootout: Boolean(input.allows_penalty_shootout),
    } as Record<string, unknown>)
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Match not created" };

  if (input.set_scores?.length) {
    await (supabase.from("set_scores") as ReturnType<typeof supabase.from>).insert(
      input.set_scores.map((s) => ({ match_id: data.id, ...s })) as Record<string, unknown>[]
    );
  }

  return { id: data.id };
}

export interface UpdateMatchInput {
  home_score?: number;
  away_score?: number;
  home_penalties?: number | null;
  away_penalties?: number | null;
  current_period?: string;
  went_to_extra_time?: boolean;
  status?: "scheduled" | "live" | "completed" | "postponed";
  scheduled_at?: string;
  venue_id?: string | null;
  scope?: MatchScope;
  allows_extra_time?: boolean;
  allows_penalty_shootout?: boolean;
  lineup_image_url?: string | null;
  referee_name?: string | null;
  assistant_referee_1?: string | null;
  assistant_referee_2?: string | null;
  postpone_reason?: string | null;
  clock_elapsed_seconds?: number;
  clock_is_running?: boolean;
  clock_is_time_lost?: boolean;
  clock_running_started_at?: string | null;
  clock_stoppage_seconds?: number;
  clock_boarded_stoppage_minutes?: number;
  clock_time_lost_started_at?: string | null;
}

export async function updateMatch(
  matchId: string,
  patch: UpdateMatchInput
): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const updated = updateDemoMatch(matchId, patch);
    return updated ? { ok: true } : { error: "Match not found" };
  }

  const supabase = await createClient();
  const body: Record<string, unknown> = { ...patch };
  if (patch.status === "live") {
    body.started_at = new Date().toISOString();
    body.postpone_reason = null;
  }
  if (patch.status === "completed") body.ended_at = new Date().toISOString();
  if (patch.status === "postponed") {
    body.clock_is_running = false;
    body.clock_running_started_at = null;
  }
  if (patch.status === "scheduled" && patch.postpone_reason === undefined) {
    body.postpone_reason = null;
  }

  const { error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .update(body)
    .eq("id", matchId)
    .is("deleted_at", null) as { error: { message: string } | null };

  if (error) return { error: error.message };

  if (patch.status === "completed") {
    const { advanceBracketAfterMatchComplete } = await import("@/lib/data/bracket-advance");
    await advanceBracketAfterMatchComplete(matchId);
  }

  return { ok: true };
}

export async function softDeleteMatch(matchId: string): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return softDeleteDemoMatch(matchId) ? { ok: true } : { error: "Match not found" };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .update({ deleted_at: new Date().toISOString(), status: "cancelled" } as Record<string, unknown>)
    .eq("id", matchId) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateMatchStatus(
  matchId: string,
  status: "scheduled" | "live" | "completed" | "postponed",
  opts?: { postpone_reason?: string | null; freshKickoff?: boolean }
): Promise<{ ok: true } | { error: string }> {
  if (status === "live" && opts?.freshKickoff) {
    return resetMatchForKickoff(matchId);
  }
  if (status === "live") {
    const gate = await assertKickoffSquad(matchId);
    if ("error" in gate) return gate;
  }
  return updateMatch(matchId, {
    status,
    ...(status === "postponed"
      ? { postpone_reason: opts?.postpone_reason?.trim() || "Match postponed" }
      : { postpone_reason: null }),
  });
}

async function assertKickoffSquad(matchId: string): Promise<{ ok: true } | { error: string }> {
  const { assertSidesHaveMinStarters } = await import("@/lib/data/lineup-gate");

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const demo = getDemoMatchById(matchId);
    if (!demo) return { error: "Match not found" };
    if (!demo.home_team_id || !demo.away_team_id) return { ok: true };
    return assertSidesHaveMinStarters({
      tournamentId: demo.tournament_id,
      homeTeamId: demo.home_team_id,
      awayTeamId: demo.away_team_id,
      homeTeamName: demo.home_team?.name,
      awayTeamName: demo.away_team?.name,
      matchId,
    });
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("matches")
    .select("id, tournament_id, home_team_id, away_team_id")
    .eq("id", matchId)
    .is("deleted_at", null)
    .maybeSingle()) as {
    data: {
      id: string;
      tournament_id: string | null;
      home_team_id: string | null;
      away_team_id: string | null;
    } | null;
  };

  if (!data?.home_team_id || !data.away_team_id) {
    return { ok: true };
  }

  return assertSidesHaveMinStarters({
    tournamentId: data.tournament_id,
    homeTeamId: data.home_team_id,
    awayTeamId: data.away_team_id,
    matchId,
  });
}

/** Wipe prior theatre and open the clock at 00:00 for a clean kick-off. */
export async function resetMatchForKickoff(
  matchId: string
): Promise<{ ok: true } | { error: string }> {
  const gate = await assertKickoffSquad(matchId);
  if ("error" in gate) return gate;

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return updateDemoMatch(matchId, {
      status: "live",
      home_score: 0,
      away_score: 0,
    })
      ? { ok: true }
      : { error: "Match not found" };
  }

  const supabase = await createClient();

  // Drop previous events so the public log starts empty.
  await (supabase.from("match_events") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("match_id", matchId);

  const { error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .update({
      status: "live",
      started_at: new Date().toISOString(),
      ended_at: null,
      home_score: 0,
      away_score: 0,
      home_penalties: null,
      away_penalties: null,
      current_period: "half_1",
      went_to_extra_time: false,
      postpone_reason: null,
      clock_elapsed_seconds: 0,
      clock_is_running: true,
      clock_is_time_lost: false,
      clock_running_started_at: new Date().toISOString(),
      clock_stoppage_seconds: 0,
      clock_boarded_stoppage_minutes: 0,
      clock_time_lost_started_at: null,
    } as Record<string, unknown>)
    .eq("id", matchId)
    .is("deleted_at", null) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}

// ─── Venues ─────────────────────────────────────────────────────────────────

export async function fetchVenues(opts?: {
  includeDeleted?: boolean;
  sportSlug?: string | null;
}): Promise<Venue[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listDemoVenues({
      includeDeleted: opts?.includeDeleted,
      sportSlug: opts?.sportSlug,
    });
  }

  const supabase = await createClient();
  let query = supabase.from("venues").select("*").order("name");
  if (!opts?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (opts?.sportSlug) {
    query = query.eq("sport_slug", opts.sportSlug);
  }
  const { data } = await query as { data: Venue[] | null };
  return data ?? [];
}

export async function createVenue(input: {
  name: string;
  location?: string;
  sport_slug?: string | null;
}): Promise<{ venue: Venue } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { venue: createDemoVenue(input) };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("venues") as ReturnType<typeof supabase.from>)
    .insert({
      name: input.name.trim(),
      location: (input.location ?? "Achievers University, Owo").trim(),
      sport_slug: input.sport_slug ?? null,
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Venue | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Venue not created" };
  return { venue: data };
}

export async function updateVenue(
  id: string,
  patch: {
    name?: string;
    location?: string;
    is_active?: boolean;
    sport_slug?: string | null;
  }
): Promise<{ venue: Venue } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const venue = updateDemoVenue(id, patch);
    return venue ? { venue } : { error: "Venue not found" };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("venues") as ReturnType<typeof supabase.from>)
    .update({ ...patch, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single() as { data: Venue | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Venue not found" };
  return { venue: data };
}

export async function softDeleteVenue(id: string): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return softDeleteDemoVenue(id) ? { ok: true } : { error: "Venue not found" };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("venues") as ReturnType<typeof supabase.from>)
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq("id", id) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}

export async function resolveVenue(id: string): Promise<Venue | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getDemoVenueById(id);

  const supabase = await createClient();
  const { data } = await supabase.from("venues").select("*").eq("id", id).maybeSingle() as {
    data: Venue | null;
  };
  return data;
}

// ─── Guest teams ────────────────────────────────────────────────────────────

export async function fetchGuestTeams(sport?: SportId): Promise<Team[]> {
  const sportDbId = sport ? sportToDbId(sport) : undefined;
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listGuestTeams(sportDbId);
  }

  const supabase = await createClient();
  let query = supabase.from("teams").select("*").eq("is_guest", true).is("deleted_at", null);
  if (sportDbId) query = query.eq("sport_id", sportDbId);
  const { data } = await query.order("name") as { data: Team[] | null };
  return data ?? [];
}

export async function createGuestTeamRepo(
  input: CreateGuestTeamInput
): Promise<{ team: Team } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { team: addGuestTeam(input) };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("teams") as ReturnType<typeof supabase.from>)
    .insert({
      name: input.name.trim(),
      sport_id: sportToDbId(input.sport),
      department_id: null,
      logo_url: input.logo_url ?? null,
      is_guest: true,
      institution: input.institution ?? null,
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Team | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Guest team not created" };
  return { team: data };
}

export async function softDeleteGuestTeam(id: string): Promise<{ ok: true } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    removeGuestTeam(id);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from("teams") as ReturnType<typeof supabase.from>)
    .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", id)
    .eq("is_guest", true) as { error: { message: string } | null };

  if (error) return { error: error.message };
  return { ok: true };
}

export interface CreateCompetitionInput {
  name: string;
  sport_id: string;
  competition_type: "league" | "cup" | "event";
  season: string;
  title_holder_name?: string | null;
  config: Record<string, unknown>;
  /** When true, fixtures stay off the keeper open list. */
  is_draft?: boolean;
  teams: Array<{ id: string; name: string; seed?: number }>;
  pairings?: Array<{
    round: string;
    round_label: string;
    position: number;
    home: { id: string; name: string } | null;
    away: { id: string; name: string } | null;
    is_bye: boolean;
  }> | null;
  /** Cup: TBD placeholder rounds after the first (persisted into bracket_fixtures). */
  future_rounds?: Array<{
    round: string;
    round_label: string;
    count: number;
  }> | null;
  league_fixtures?: Array<{
    matchweek: number;
    home: { id: string; name: string };
    away: { id: string; name: string };
  }> | null;
  /** Custom / event: fully specified fixtures with kick-off + venue. */
  manual_fixtures?: Array<{
    home: { id: string; name: string };
    away: { id: string; name: string };
    scheduled_at: string;
    venue_id?: string | null;
    allows_extra_time?: boolean;
    allows_penalty_shootout?: boolean;
  }> | null;
}

/**
 * Creates the tournament, registers teams, and materializes the first-round
 * bracket (cup) — bye ties are stored as completed with the bye team advancing.
 */
export async function createCompetition(
  input: CreateCompetitionInput
): Promise<{ id: string; fixtures: number } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return createDemoCompetition(input);
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, input.sport_id);
  if (typeof sportUuid !== "string") return sportUuid;

  const category =
    input.competition_type === "cup" ? "knockout_cup" : "league";
  const format =
    input.competition_type === "cup"
      ? "knockout_only"
      : input.competition_type === "event"
        ? "league"
        : "league";

  const rules = {
    extra_time: Boolean(input.config.extra_time),
    penalty_shootout: Boolean(input.config.penalty_shootout),
  };

  const { data: tournament, error: tErr } = await (supabase.from("tournaments") as ReturnType<typeof supabase.from>)
    .insert({
      name: input.name,
      sport_id: sportUuid,
      category,
      format,
      competition_type: input.competition_type,
      season: input.season,
      config: input.config,
      title_holder_name: input.title_holder_name ?? null,
      rules,
      is_draft: Boolean(input.is_draft),
    } as Record<string, unknown>)
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (tErr) return { error: tErr.message };
  if (!tournament) return { error: "Tournament not created" };

  const byeTeamIds = new Set(
    (input.pairings ?? []).filter((p) => p.is_bye && p.home).map((p) => p.home!.id)
  );

  const { error: regErr } = await (supabase.from("tournament_teams") as ReturnType<typeof supabase.from>)
    .insert(
      input.teams.map((t) => ({
        tournament_id: tournament.id,
        team_id: t.id,
        seed: t.seed ?? null,
        received_bye: byeTeamIds.has(t.id),
      })) as Record<string, unknown>[]
    ) as { error: { message: string } | null };

  if (regErr) return { error: regErr.message };

  let fixtures = 0;

  if (input.pairings?.length) {
    // First-round ties become real matches so keepers can pick them up.
    const playable = input.pairings.filter((p) => !p.is_bye && p.home && p.away);
    const matchIds: Array<string | null> = [];
    for (const [i, p] of playable.entries()) {
      const { data: m, error: mErr } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
        .insert({
          tournament_id: tournament.id,
          sport_id: sportUuid,
          home_team_id: p.home!.id,
          away_team_id: p.away!.id,
          status: "scheduled",
          current_period: "not_started",
          home_score: 0,
          away_score: 0,
          scheduled_at: nextMatchday(0, Math.floor(i / 2)),
          scope: "official",
          competition_phase: p.round,
        } as Record<string, unknown>)
        .select("id")
        .single() as { data: { id: string } | null; error: { message: string } | null };
      if (mErr) return { error: mErr.message };
      matchIds.push(m?.id ?? null);
      fixtures += 1;
    }

    const firstRoundRows = input.pairings.map((p, i) => ({
      tournament_id: tournament.id,
      round: p.round,
      round_label: p.round_label,
      match_id: p.is_bye ? null : matchIds[playable.indexOf(p)] ?? null,
      home_team_id: p.home?.id ?? null,
      away_team_id: p.away?.id ?? null,
      home_display_name: p.home?.name ?? null,
      away_display_name: p.is_bye ? "BYE" : (p.away?.name ?? null),
      status: p.is_bye ? "completed" : "scheduled",
      bracket_mode: "team",
      sort_order: i,
    }));

    // Seed later rounds as TBD so public brackets show full shape and winners can advance.
    const laterRows: Array<Record<string, unknown>> = [];
    let baseSort = firstRoundRows.length;
    for (const fr of input.future_rounds ?? []) {
      for (let i = 0; i < fr.count; i++) {
        laterRows.push({
          tournament_id: tournament.id,
          round: fr.round,
          round_label: fr.round_label,
          match_id: null,
          home_team_id: null,
          away_team_id: null,
          home_display_name: "TBD",
          away_display_name: "TBD",
          status: "scheduled",
          bracket_mode: "team",
          sort_order: i,
        });
      }
      baseSort += fr.count;
    }
    void baseSort;

    const { error: bErr } = await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
      .insert([...firstRoundRows, ...laterRows] as Record<string, unknown>[]) as {
      error: { message: string } | null;
    };
    if (bErr) return { error: bErr.message };

    // Place first-round bye winners into the next round immediately.
    const { nextBracketSlot, nextKnockoutRound } = await import(
      "@/lib/competition/competition-builder"
    );
    for (const [i, p] of input.pairings.entries()) {
      if (!p.is_bye || !p.home) continue;
      const nextRound = nextKnockoutRound(p.round);
      if (!nextRound) continue;
      const slot = nextBracketSlot(i);
      const sidePatch =
        slot.side === "home"
          ? { home_team_id: p.home.id, home_display_name: p.home.name }
          : { away_team_id: p.home.id, away_display_name: p.home.name };
      await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
        .update(sidePatch as Record<string, unknown>)
        .eq("tournament_id", tournament.id)
        .eq("round", nextRound)
        .eq("sort_order", slot.position);
    }
  }

  if (input.league_fixtures?.length) {
    const { error: mErr } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
      .insert(
        input.league_fixtures.map((f, i) => ({
          tournament_id: tournament.id,
          sport_id: sportUuid,
          home_team_id: f.home.id,
          away_team_id: f.away.id,
          status: "scheduled",
          current_period: "not_started",
          home_score: 0,
          away_score: 0,
          scheduled_at: nextMatchday(f.matchweek - 1, i % 3),
          scope: "official",
          competition_phase: `matchweek_${f.matchweek}`,
        })) as Record<string, unknown>[]
      ) as { error: { message: string } | null };
    if (mErr) return { error: mErr.message };
    fixtures += input.league_fixtures.length;
  }

  if (input.manual_fixtures?.length) {
    const { error: mErr } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
      .insert(
        input.manual_fixtures.map((f, i) => ({
          tournament_id: tournament.id,
          sport_id: sportUuid,
          home_team_id: f.home.id,
          away_team_id: f.away.id,
          status: "scheduled",
          current_period: "not_started",
          home_score: 0,
          away_score: 0,
          scheduled_at: f.scheduled_at,
          venue_id: f.venue_id ?? null,
          scope: "official",
          competition_phase: `matchday_${i + 1}`,
          allows_extra_time: Boolean(f.allows_extra_time),
          allows_penalty_shootout: Boolean(f.allows_penalty_shootout),
        })) as Record<string, unknown>[]
      ) as { error: { message: string } | null };
    if (mErr) return { error: mErr.message };
    fixtures += input.manual_fixtures.length;
  }

  return { id: tournament.id, fixtures };
}

/** Demo-mode twin of createCompetition — tournament + fixtures in the session overlay. */
function createDemoCompetition(input: CreateCompetitionInput): { id: string; fixtures: number } {
  const id = `tourn-created-${Date.now().toString(36)}`;
  const tournament: Tournament = registerDemoTournament(
    {
      id,
      name: input.name,
      sport_id: input.sport_id,
      category: input.competition_type === "cup" ? "knockout_cup" : "league",
      format: input.competition_type === "cup" ? "knockout_only" : "league",
      competition_type: input.competition_type,
      season: input.season,
      rules: {
        extra_time: Boolean(input.config.extra_time),
        penalty_shootout: Boolean(input.config.penalty_shootout),
      },
      is_draft: Boolean(input.is_draft),
      title_holder: input.title_holder_name
        ? { team_name: input.title_holder_name, season: "Previous" }
        : null,
    },
    {
      config: input.config,
      team_ids: input.teams.map((t) => t.id),
    }
  );

  let fixtures = 0;
  for (const [i, p] of (input.pairings ?? []).entries()) {
    if (p.is_bye || !p.home || !p.away) continue;
    postDemoMatch({
      sport_id: input.sport_id,
      home_team_id: p.home.id,
      away_team_id: p.away.id,
      status: "scheduled",
      scheduled_at: nextMatchday(0, Math.floor(i / 2)),
      home_score: 0,
      away_score: 0,
      scope: "official",
      tournament_id: id,
      tournament,
      competition_phase: p.round,
    });
    fixtures += 1;
  }
  for (const [i, f] of (input.league_fixtures ?? []).entries()) {
    postDemoMatch({
      sport_id: input.sport_id,
      home_team_id: f.home.id,
      away_team_id: f.away.id,
      status: "scheduled",
      scheduled_at: nextMatchday(f.matchweek - 1, i % 3),
      home_score: 0,
      away_score: 0,
      scope: "official",
      tournament_id: id,
      tournament,
      competition_phase: `matchweek_${f.matchweek}`,
    });
    fixtures += 1;
  }
  for (const [i, f] of (input.manual_fixtures ?? []).entries()) {
    postDemoMatch({
      sport_id: input.sport_id,
      home_team_id: f.home.id,
      away_team_id: f.away.id,
      status: "scheduled",
      scheduled_at: f.scheduled_at,
      home_score: 0,
      away_score: 0,
      scope: "official",
      venue_id: f.venue_id ?? null,
      tournament_id: id,
      tournament,
      competition_phase: `matchday_${i + 1}`,
      allows_extra_time: Boolean(f.allows_extra_time),
      allows_penalty_shootout: Boolean(f.allows_penalty_shootout),
    });
    fixtures += 1;
  }
  return { id, fixtures };
}
