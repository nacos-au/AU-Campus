import type { Match, MatchScope, SetScore, Team, Tournament } from "@/lib/types/database";
import { DEMO_MATCHES, DEMO_SPORTS } from "@/lib/data/demo";
import { findDemoTeam } from "@/lib/data/demo-roster";
import { getDemoVenueById } from "@/lib/data/venues";

/** Session overlay for manually posted / edited matches in demo mode. */
let postedMatches: Match[] = [];

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
  for (const m of postedMatches) {
    if (!m.deleted_at) byId.set(m.id, hydrateVenue(m));
  }
  return Array.from(byId.values());
}

export function getDemoMatchById(id: string): Match | null {
  const posted = postedMatches.find((m) => m.id === id);
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
  scope?: MatchScope;
  venue_id?: string | null;
  set_scores?: SetScore[];
  tournament_id?: string | null;
  /** Competition the fixture belongs to (defaults to the sport's Friendlies). */
  tournament?: Tournament | null;
  competition_phase?: string | null;
  id?: string;
}

let postedSeq = 0;

export function postDemoMatch(input: PostDemoMatchInput): Match {
  const home = findTeam(input.home_team_id);
  const away = findTeam(input.away_team_id);
  const tournament = input.tournament ?? friendlyTournament(input.sport_id);
  const venue = input.venue_id ? getDemoVenueById(input.venue_id) : null;
  postedSeq += 1;

  const match: Match = {
    id: input.id ?? `match-posted-${Date.now()}-${postedSeq}`,
    tournament_id: input.tournament_id || tournament.id,
    competition_phase: (input.competition_phase ?? undefined) as Match["competition_phase"],
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

  postedMatches = [...postedMatches, match];
  return match;
}

export function updateDemoMatch(
  id: string,
  patch: Partial<Pick<Match, "home_score" | "away_score" | "status" | "scheduled_at" | "venue_id" | "scope" | "deleted_at">>
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

  const postedIdx = postedMatches.findIndex((m) => m.id === id);
  if (postedIdx >= 0) {
    postedMatches = postedMatches.map((m, i) => (i === postedIdx ? next : m));
  } else {
    postedMatches = [...postedMatches, next];
  }
  return next;
}

export function softDeleteDemoMatch(id: string): boolean {
  return Boolean(updateDemoMatch(id, { deleted_at: new Date().toISOString() }));
}
