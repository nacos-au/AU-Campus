import type { Match, MatchScope, SetScore, Team, Tournament } from "@/lib/types/database";
import { DEMO_MATCHES, DEMO_SPORTS } from "@/lib/data/demo";
import { findDemoTeam } from "@/lib/data/demo-roster";
import { getDemoVenueById } from "@/lib/data/venues";

/**
 * Session overlay for manually posted / edited matches in demo mode.
 * Kept on globalThis so API routes and server-rendered pages (separate module
 * graphs in dev) see the same edits.
 */
const demoMatchState = ((globalThis as typeof globalThis & {
  __auScoreDemoMatches?: { posted: Match[] };
}).__auScoreDemoMatches ??= { posted: [] });

function findTeam(id: string): Team | undefined {
  return findDemoTeam(id);
}

function friendlyTournament(sportId: string): Tournament {
  return {
    id: `tourn-friendly-${sportId}`,
    name: "Friendlies",
    sport_id: sportId,
    category: "friendly",
    season: "2025/26",
    rules: {},
  };
}

export function listAllDemoMatches(): Match[] {
  const byId = new Map<string, Match>();
  for (const m of DEMO_MATCHES) {
    if (!m.deleted_at) byId.set(m.id, hydrateVenue(m));
  }
  for (const m of demoMatchState.posted) {
    if (!m.deleted_at) byId.set(m.id, hydrateVenue(m));
  }
  return Array.from(byId.values());
}

export function getDemoMatchById(id: string): Match | null {
  const posted = demoMatchState.posted.find((m) => m.id === id);
  if (posted) return hydrateVenue(posted);
  const base = DEMO_MATCHES.find((m) => m.id === id);
  return base ? hydrateVenue(base) : null;
}

function hydrateVenue(match: Match): Match {
  if (match.venue) return match;
  const venue = match.venue_id ? getDemoVenueById(match.venue_id) : null;
  return venue ? { ...match, venue } : match;
}

export interface PostDemoMatchInput {
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
  set_scores?: SetScore[];
  tournament_id?: string | null;
  /** Competition the fixture belongs to (defaults to the sport's Friendlies). */
  tournament?: Tournament | null;
  competition_phase?: string | null;
  lineup_image_url?: string | null;
  allows_extra_time?: boolean;
  allows_penalty_shootout?: boolean;
  id?: string;
}

let postedSeq = 0;

export function postDemoMatch(input: PostDemoMatchInput): Match {
  const home = findTeam(input.home_team_id);
  const away = findTeam(input.away_team_id);
  const tournament = input.tournament ?? friendlyTournament(input.sport_id);
  const venue = input.venue_id ? getDemoVenueById(input.venue_id) : null;
  postedSeq += 1;

  const decidedOnPens =
    input.home_penalties != null &&
    input.away_penalties != null &&
    input.status === "completed";

  const match: Match = {
    id: input.id ?? `match-posted-${Date.now()}-${postedSeq}`,
    tournament_id: input.tournament_id || tournament.id,
    competition_phase: (input.competition_phase ?? undefined) as Match["competition_phase"],
    sport_id: input.sport_id,
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
    lineup_image_url: input.lineup_image_url ?? null,
    allows_extra_time: input.allows_extra_time ?? false,
    allows_penalty_shootout: input.allows_penalty_shootout ?? false,
    scheduled_at: input.scheduled_at,
    started_at: input.status === "completed" ? input.scheduled_at : null,
    ended_at: input.status === "completed" ? new Date().toISOString() : null,
    win_probability: null,
    scope: input.scope ?? "pickup",
    venue_id: input.venue_id ?? null,
    venue,
    set_scores: input.set_scores,
    home_team: home,
    away_team: away,
    tournament,
    sport: DEMO_SPORTS.find((s) => s.id === input.sport_id),
  };

  demoMatchState.posted = [...demoMatchState.posted, match];
  return match;
}

export function updateDemoMatch(
  id: string,
  patch: Partial<
    Pick<
      Match,
      | "home_score"
      | "away_score"
      | "status"
      | "scheduled_at"
      | "venue_id"
      | "scope"
      | "deleted_at"
      | "referee_name"
      | "assistant_referee_1"
      | "assistant_referee_2"
      | "postpone_reason"
      | "lineup_image_url"
    >
  >
): Match | null {
  const existing = getDemoMatchById(id);
  if (!existing) return null;

  const venue =
    patch.venue_id !== undefined
      ? patch.venue_id
        ? getDemoVenueById(patch.venue_id)
        : null
      : existing.venue;

  const next: Match = {
    ...existing,
    ...patch,
    venue: venue ?? undefined,
    venue_id: patch.venue_id !== undefined ? patch.venue_id : existing.venue_id,
  };

  const postedIdx = demoMatchState.posted.findIndex((m) => m.id === id);
  if (postedIdx >= 0) {
    demoMatchState.posted = demoMatchState.posted.map((m, i) => (i === postedIdx ? next : m));
  } else {
    demoMatchState.posted = [...demoMatchState.posted, next];
  }
  return next;
}

export function softDeleteDemoMatch(id: string): boolean {
  return Boolean(updateDemoMatch(id, { deleted_at: new Date().toISOString() }));
}
