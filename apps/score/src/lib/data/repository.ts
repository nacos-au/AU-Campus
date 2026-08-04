import type {
  BracketFixture,
  GroupStandingRow,
  Match,
  MatchScope,
  MeetEventFixture,
  PeriodScore,
  SetScore,
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
} from "@/lib/data/demo-competition";
import { DEMO_PLAYERS } from "@/lib/data/demo";
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
};

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

export async function fetchTournamentForSport(sportDbId: string): Promise<Tournament | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getTournamentForSport(sportDbId);

  const supabase = await createClient();
  const { data: sports } = await supabase.from("sports").select("id").limit(1);
  if (!sports?.length) return getTournamentForSport(sportDbId);

  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("sport_id", sportDbId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: TournamentRow | null };

  if (!data) return getTournamentForSport(sportDbId);
  return {
    id: data.id,
    name: data.name,
    sport_id: data.sport_id,
    category: data.category as Tournament["category"],
    format: data.format as Tournament["format"],
    rules: (data.rules ?? {}) as Tournament["rules"],
    season: data.season,
    phases: data.phases,
  };
}

export async function fetchGroupStandings(sportDbId: string): Promise<GroupStandingRow[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getGroupStandingsForSport(sportDbId);
  // Live path: join tournament_groups + group_standings + teams — fallback to demo until seeded
  return getGroupStandingsForSport(sportDbId);
}

export async function fetchBracketFixtures(sportDbId: string): Promise<BracketFixture[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getBracketFixturesForSport(sportDbId);

  const supabase = await createClient();
  const tournament = await fetchTournamentForSport(sportDbId);
  if (!tournament) return [];

  const { data } = await supabase
    .from("bracket_fixtures")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order") as { data: BracketRow[] | null };

  if (!data?.length) return getBracketFixturesForSport(sportDbId);

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

export async function fetchMeetEvents(sportDbId: string): Promise<MeetEventFixture[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) return getMeetEventsForSport(sportDbId);

  const supabase = await createClient();
  const tournament = await fetchTournamentForSport(sportDbId);
  if (!tournament) return [];

  const { data } = await supabase
    .from("meet_events")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("sort_order") as { data: MeetEventRow[] | null };

  if (!data?.length) return getMeetEventsForSport(sportDbId);

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

  if (!data) return getDemoMatchById(id);
  return data as unknown as Match;
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

  if (!data?.length) return getEventsForMatch(matchId);

  return data.map((row) => ({
    id: row.id,
    match_id: row.match_id,
    player: {
      id: row.player_id ?? "",
      department_id: "unknown",
      first_name: "",
      last_name: "",
      matric_number: null,
      avatar_url: null,
      position: null,
    },
    team_id: row.team_id ?? "",
    team_name: "",
    team_code: "",
    team_logo_url: null,
    event_type: row.event_type,
    match_time: row.match_time,
    period: row.period,
    details: row.details,
  }));
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

  if (!data?.length) return getPeriodScoresForMatch(matchId);
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

  if (!data?.length) return getSetScoresForMatch(matchId);
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

  if (!data?.length) return getTrackResultsForMatch(matchId);

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
    .select("jersey_number, squad_role, player_id")
    .eq("team_id", teamId) as {
    data: Array<{ jersey_number: number | null; squad_role: string | null; player_id: string }> | null;
  };

  if (!data?.length) return getSquadForTeam(teamId, sportId);

  const squad: SquadPlayer[] = [];
  for (const row of data) {
    const fromDemo = DEMO_PLAYERS.find((p) => p.id === row.player_id);
    if (!fromDemo) continue;
    squad.push({
      ...fromDemo,
      jersey_number: row.jersey_number ?? undefined,
      squad_role: row.squad_role ?? "Squad",
    });
  }
  return squad.length ? squad : getSquadForTeam(teamId, sportId);
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

export async function createMatchEvent(input: CreateMatchEventInput): Promise<{ id: string } | { error: string }> {
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
  return { id: data.id };
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

  if (!data?.length) return getAwardsForSport(sportDbId);
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
  scope?: MatchScope;
  venue_id?: string | null;
  tournament_id?: string | null;
  set_scores?: Array<{ set_number: number; home_games: number; away_games: number }>;
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
    const match = postDemoMatch(input);
    return { id: match.id };
  }

  const supabase = await createClient();
  const tournamentId =
    input.tournament_id ?? (await resolveFriendlyTournamentId(supabase, input.sport_id));
  if (typeof tournamentId === "object") return tournamentId;

  const { data, error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .insert({
      tournament_id: tournamentId,
      sport_id: input.sport_id,
      home_team_id: input.home_team_id,
      away_team_id: input.away_team_id,
      status: input.status,
      current_period: input.status === "completed" ? "full_time" : "not_started",
      home_score: input.home_score,
      away_score: input.away_score,
      scheduled_at: input.scheduled_at,
      started_at: input.status === "completed" ? input.scheduled_at : null,
      ended_at: input.status === "completed" ? new Date().toISOString() : null,
      scope: input.scope ?? "pickup",
      venue_id: input.venue_id ?? null,
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
  status?: "scheduled" | "live" | "completed";
  scheduled_at?: string;
  venue_id?: string | null;
  scope?: MatchScope;
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
  if (patch.status === "live") body.started_at = new Date().toISOString();
  if (patch.status === "completed") body.ended_at = new Date().toISOString();

  const { error } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
    .update(body)
    .eq("id", matchId)
    .is("deleted_at", null) as { error: { message: string } | null };

  if (error) return { error: error.message };
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
  status: "scheduled" | "live" | "completed"
): Promise<{ ok: true } | { error: string }> {
  return updateMatch(matchId, { status });
}

// ─── Venues ─────────────────────────────────────────────────────────────────

export async function fetchVenues(opts?: { includeDeleted?: boolean }): Promise<Venue[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return listDemoVenues({ includeDeleted: opts?.includeDeleted });
  }

  const supabase = await createClient();
  let query = supabase.from("venues").select("*").order("name");
  if (!opts?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  const { data } = await query as { data: Venue[] | null };
  return data ?? [];
}

export async function createVenue(input: {
  name: string;
  location?: string;
}): Promise<{ venue: Venue } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { venue: createDemoVenue(input) };
  }

  const supabase = await createClient();
  const { data, error } = await (supabase.from("venues") as ReturnType<typeof supabase.from>)
    .insert({
      name: input.name.trim(),
      location: (input.location ?? "Achievers University, Owo").trim(),
    } as Record<string, unknown>)
    .select("*")
    .single() as { data: Venue | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Venue not created" };
  return { venue: data };
}

export async function updateVenue(
  id: string,
  patch: { name?: string; location?: string; is_active?: boolean }
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
  competition_type: "league" | "cup";
  season: string;
  title_holder_name?: string | null;
  config: Record<string, unknown>;
  teams: Array<{ id: string; name: string; seed?: number }>;
  pairings?: Array<{
    round: string;
    round_label: string;
    position: number;
    home: { id: string; name: string } | null;
    away: { id: string; name: string } | null;
    is_bye: boolean;
  }> | null;
  league_fixtures?: Array<{
    matchweek: number;
    home: { id: string; name: string };
    away: { id: string; name: string };
  }> | null;
}

/**
 * Creates the tournament, registers teams, and materializes the first-round
 * bracket (cup) — bye ties are stored as completed with the bye team advancing.
 */
export async function createCompetition(
  input: CreateCompetitionInput
): Promise<{ id: string } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { error: "Demo mode: competition preview only — connect Supabase to persist" };
  }

  const supabase = await createClient();

  const { data: tournament, error: tErr } = await (supabase.from("tournaments") as ReturnType<typeof supabase.from>)
    .insert({
      name: input.name,
      sport_id: input.sport_id,
      category: input.competition_type === "cup" ? "knockout_cup" : "league",
      format: input.competition_type === "cup" ? "knockout_only" : "league",
      competition_type: input.competition_type,
      season: input.season,
      config: input.config,
      title_holder_name: input.title_holder_name ?? null,
      rules: {},
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

  if (input.pairings?.length) {
    const { error: bErr } = await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
      .insert(
        input.pairings.map((p, i) => ({
          tournament_id: tournament.id,
          round: p.round,
          round_label: p.round_label,
          home_team_id: p.home?.id ?? null,
          away_team_id: p.away?.id ?? null,
          home_display_name: p.home?.name ?? null,
          away_display_name: p.is_bye ? "BYE" : (p.away?.name ?? null),
          status: p.is_bye ? "completed" : "scheduled",
          bracket_mode: "team",
          sort_order: i,
        })) as Record<string, unknown>[]
      ) as { error: { message: string } | null };
    if (bErr) return { error: bErr.message };
  }

  if (input.league_fixtures?.length) {
    const { error: mErr } = await (supabase.from("matches") as ReturnType<typeof supabase.from>)
      .insert(
        input.league_fixtures.map((f) => ({
          tournament_id: tournament.id,
          sport_id: input.sport_id,
          home_team_id: f.home.id,
          away_team_id: f.away.id,
          status: "scheduled",
          current_period: "not_started",
          home_score: 0,
          away_score: 0,
          competition_phase: `matchweek_${f.matchweek}`,
        })) as Record<string, unknown>[]
      ) as { error: { message: string } | null };
    if (mErr) return { error: mErr.message };
  }

  return { id: tournament.id };
}
