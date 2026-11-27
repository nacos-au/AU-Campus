import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  getCompetitionDetail,
  listCompetitionFixtures,
  listCompetitionRoster,
  tournamentRequiresNamedBench,
} from "@/lib/data/competition-rosters";
import { fetchMatchById } from "@/lib/data/repository";
import { submitMatchLineup } from "@/lib/data/match-lineups";
import { listDemoRosterPlayers } from "@/lib/data/demo-roster";
import { dbIdToSport } from "@/lib/utils/sport";
import {
  effectiveCutoffMinutes,
  isSubmissionClosed,
  DEFAULT_LINEUP_CUTOFF_MINUTES,
} from "@/lib/lineup-links/cutoff";
import { hashLineupToken, newLineupToken } from "@/lib/lineup-links/token";
import {
  normaliseAvailability,
  type AvailabilityStatus,
  type SheetEntry,
} from "@/lib/match/lineup-merge";
import { validateLineupSheet } from "@/lib/match/lineup-validate";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type LineupLinkRow = {
  id: string;
  team_id: string;
  /** Per-link override. Null means "follow the competition default". */
  cutoff_minutes: number | null;
  effective_cutoff_minutes: number;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
};

export type CompetitionLinkTeam = {
  team_id: string;
  team_name: string;
  roster_count: number;
  link: LineupLinkRow | null;
};

export type CompetitionLinkOverview = {
  competition_cutoff_minutes: number;
  teams: CompetitionLinkTeam[];
};

export type LineupLinkContext = {
  competition: { id: string; name: string; season: string; sport_id: string };
  team: { id: string; name: string; logo_url: string | null; code: string | null };
  formation: string;
  /** Starters the sport needs (football 11, basketball 5, volleyball 6). */
  starters: number;
  cutoff_minutes: number;
  squad: Array<{
    player_id: string;
    first_name: string;
    last_name: string;
    position: string | null;
    jersey_number: number | null;
    is_captain: boolean;
    availability: AvailabilityStatus;
  }>;
  matches: Array<{
    id: string;
    scheduled_at: string;
    home: boolean;
    opponent: string;
    cutoff_at: string;
    closed: boolean;
    pending: boolean;
  }>;
};

export type PendingLineupSubmission = {
  id: string;
  match_id: string;
  team_id: string;
  team_name: string;
  match_label: string;
  scheduled_at: string;
  players: Array<SheetEntry & { name: string }>;
  formation: string | null;
  coach_name: string | null;
  submitted_at: string;
};

/* -------------------------------------------------------------------------- */
/* Demo store (in-memory, local only)                                         */
/* -------------------------------------------------------------------------- */

type DemoLink = {
  id: string;
  tournament_id: string;
  team_id: string;
  token_hash: string;
  cutoff_minutes: number | null;
  revoked_at: string | null;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
};

type DemoSubmission = {
  id: string;
  match_id: string;
  team_id: string;
  link_id: string;
  players: SheetEntry[];
  formation: string | null;
  coach_name: string | null;
  status: "pending" | "approved" | "rejected" | "superseded";
  submitted_at: string;
};

/**
 * Kept on globalThis so API routes and server-rendered pages (separate module
 * graphs in dev) share the same demo links and submissions.
 */
type LineupLinkDemoState = {
  links: DemoLink[];
  submissions: DemoSubmission[];
  competitionCutoff: Map<string, number>;
  seq: number;
};
const demoState: LineupLinkDemoState = ((globalThis as typeof globalThis & {
  __auScoreDemoLineupLinks?: LineupLinkDemoState;
}).__auScoreDemoLineupLinks ??= {
  links: [],
  submissions: [],
  competitionCutoff: new Map(),
  seq: 0,
});

function demoId(prefix: string): string {
  demoState.seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${demoState.seq}`;
}

async function inDemo(): Promise<boolean> {
  return !hasSupabaseConfig() || (await getScoreDemoMode());
}

type Rpc = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function rpcClient<T>(supabase: T): Rpc {
  return supabase as unknown as Rpc;
}

async function competitionDefaultCutoff(tournamentId: string): Promise<number> {
  if (await inDemo()) {
    return demoState.competitionCutoff.get(tournamentId) ?? DEFAULT_LINEUP_CUTOFF_MINUTES;
  }
  const supabase = await createClient();
  const { data } = (await supabase
    .from("tournaments")
    .select("lineup_cutoff_minutes")
    .eq("id", tournamentId)
    .maybeSingle()) as { data: { lineup_cutoff_minutes: number | null } | null };
  return data?.lineup_cutoff_minutes ?? DEFAULT_LINEUP_CUTOFF_MINUTES;
}

function toLinkRow(link: DemoLink, competitionDefault: number): LineupLinkRow {
  return {
    id: link.id,
    team_id: link.team_id,
    cutoff_minutes: link.cutoff_minutes,
    effective_cutoff_minutes: effectiveCutoffMinutes(link.cutoff_minutes, competitionDefault),
    created_at: link.created_at,
    last_used_at: link.last_used_at,
    use_count: link.use_count,
  };
}

/* -------------------------------------------------------------------------- */
/* Staff: overview and link management                                        */
/* -------------------------------------------------------------------------- */

export async function getLinkOverview(
  tournamentId: string
): Promise<CompetitionLinkOverview | { error: string }> {
  const detail = await getCompetitionDetail(tournamentId);
  if ("error" in detail) return detail;
  const competitionDefault = await competitionDefaultCutoff(tournamentId);

  if (await inDemo()) {
    const teams = detail.teams.map((t) => {
      const link = demoState.links.find(
        (l) => l.tournament_id === tournamentId && l.team_id === t.team_id && !l.revoked_at
      );
      return {
        team_id: t.team_id,
        team_name: t.team_name,
        roster_count: t.roster_count,
        link: link ? toLinkRow(link, competitionDefault) : null,
      };
    });
    return { competition_cutoff_minutes: competitionDefault, teams };
  }

  const supabase = await createClient();
  const { data: links } = (await supabase
    .from("lineup_submission_links")
    .select("id, team_id, cutoff_minutes, created_at, last_used_at, use_count")
    .eq("tournament_id", tournamentId)
    .is("revoked_at", null)) as {
    data: Array<{
      id: string;
      team_id: string;
      cutoff_minutes: number | null;
      created_at: string;
      last_used_at: string | null;
      use_count: number;
    }> | null;
  };
  const byTeam = new Map((links ?? []).map((l) => [l.team_id, l]));

  return {
    competition_cutoff_minutes: competitionDefault,
    teams: detail.teams.map((t) => {
      const l = byTeam.get(t.team_id);
      return {
        team_id: t.team_id,
        team_name: t.team_name,
        roster_count: t.roster_count,
        link: l
          ? {
              id: l.id,
              team_id: l.team_id,
              cutoff_minutes: l.cutoff_minutes,
              effective_cutoff_minutes: effectiveCutoffMinutes(l.cutoff_minutes, competitionDefault),
              created_at: l.created_at,
              last_used_at: l.last_used_at,
              use_count: l.use_count,
            }
          : null,
      };
    }),
  };
}

/**
 * Create a link for one side. Any active link for that side is revoked first,
 * so regenerating always invalidates the old URL. Returns the token once.
 */
export async function createLineupLink(input: {
  tournament_id: string;
  team_id: string;
  cutoff_minutes?: number | null;
  created_by?: string | null;
}): Promise<{ ok: true; link_id: string; token: string } | { error: string }> {
  const token = newLineupToken();
  const tokenHash = hashLineupToken(token);

  if (await inDemo()) {
    const detail = await getCompetitionDetail(input.tournament_id);
    if ("error" in detail) return detail;
    if (!detail.teams.some((t) => t.team_id === input.team_id)) {
      return { error: "Team is not in this competition" };
    }
    const now = new Date().toISOString();
    for (const l of demoState.links) {
      if (l.tournament_id === input.tournament_id && l.team_id === input.team_id && !l.revoked_at) {
        l.revoked_at = now;
      }
    }
    const link: DemoLink = {
      id: demoId("link"),
      tournament_id: input.tournament_id,
      team_id: input.team_id,
      token_hash: tokenHash,
      cutoff_minutes: input.cutoff_minutes ?? null,
      revoked_at: null,
      created_at: now,
      last_used_at: null,
      use_count: 0,
    };
    demoState.links.push(link);
    return { ok: true, link_id: link.id, token };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  await (supabase.from("lineup_submission_links") as ReturnType<typeof supabase.from>)
    .update({ revoked_at: now } as Record<string, unknown>)
    .eq("tournament_id", input.tournament_id)
    .eq("team_id", input.team_id)
    .is("revoked_at", null);

  const { data, error } = (await (supabase.from("lineup_submission_links") as ReturnType<typeof supabase.from>)
    .insert({
      tournament_id: input.tournament_id,
      team_id: input.team_id,
      token_hash: tokenHash,
      cutoff_minutes: input.cutoff_minutes ?? null,
      created_by: input.created_by ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };
  if (error || !data) return { error: error?.message ?? "Could not create link" };
  return { ok: true, link_id: data.id, token };
}

/** Create links for sides that don't have one yet. Existing links are left alone. */
export async function generateMissingLineupLinks(input: {
  tournament_id: string;
  team_ids?: string[];
  cutoff_minutes?: number | null;
  created_by?: string | null;
}): Promise<{ ok: true; created: Array<{ team_id: string; team_name: string; token: string }> } | { error: string }> {
  const overview = await getLinkOverview(input.tournament_id);
  if ("error" in overview) return overview;
  const wanted = input.team_ids?.length ? new Set(input.team_ids) : null;
  const created: Array<{ team_id: string; team_name: string; token: string }> = [];
  for (const t of overview.teams) {
    if (wanted && !wanted.has(t.team_id)) continue;
    if (t.link) continue;
    const result = await createLineupLink({
      tournament_id: input.tournament_id,
      team_id: t.team_id,
      cutoff_minutes: input.cutoff_minutes ?? null,
      created_by: input.created_by,
    });
    if ("error" in result) return result;
    created.push({ team_id: t.team_id, team_name: t.team_name, token: result.token });
  }
  return { ok: true, created };
}

export async function revokeLineupLink(
  tournamentId: string,
  linkId: string
): Promise<{ ok: true } | { error: string }> {
  if (await inDemo()) {
    const link = demoState.links.find((l) => l.id === linkId && l.tournament_id === tournamentId);
    if (!link) return { error: "Link not found" };
    link.revoked_at = new Date().toISOString();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = (await (supabase.from("lineup_submission_links") as ReturnType<typeof supabase.from>)
    .update({ revoked_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", linkId)
    .eq("tournament_id", tournamentId)
    .is("revoked_at", null)) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Set the cut-off on the active link for each side. Sides without an active link
 * are skipped. Pass null to go back to the competition default.
 */
export async function setLinkCutoffs(input: {
  tournament_id: string;
  link_ids?: string[];
  team_ids?: string[];
  cutoff_minutes: number | null;
}): Promise<{ ok: true; updated: number } | { error: string }> {
  const overview = await getLinkOverview(input.tournament_id);
  if ("error" in overview) return overview;
  const linkIds = new Set(input.link_ids ?? []);
  const teamIds = input.team_ids?.length ? new Set(input.team_ids) : null;
  const targets = overview.teams
    .filter((t) => t.link)
    .filter((t) => (linkIds.size ? linkIds.has(t.link!.id) : true))
    .filter((t) => (teamIds ? teamIds.has(t.team_id) : true))
    .map((t) => t.link!.id);

  if (await inDemo()) {
    for (const link of demoState.links) {
      if (targets.includes(link.id)) link.cutoff_minutes = input.cutoff_minutes;
    }
    return { ok: true, updated: targets.length };
  }

  if (!targets.length) return { ok: true, updated: 0 };
  const supabase = await createClient();
  const { error } = (await (supabase.from("lineup_submission_links") as ReturnType<typeof supabase.from>)
    .update({ cutoff_minutes: input.cutoff_minutes } as Record<string, unknown>)
    .in("id", targets)) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return { ok: true, updated: targets.length };
}

export async function setCompetitionCutoff(
  tournamentId: string,
  cutoffMinutes: number
): Promise<{ ok: true } | { error: string }> {
  if (await inDemo()) {
    demoState.competitionCutoff.set(tournamentId, cutoffMinutes);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = (await (supabase.from("tournaments") as ReturnType<typeof supabase.from>)
    .update({ lineup_cutoff_minutes: cutoffMinutes } as Record<string, unknown>)
    .eq("id", tournamentId)) as { error: { message: string } | null };
  if (error) return { error: error.message };
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Rep: context from a token                                                  */
/* -------------------------------------------------------------------------- */

export async function getLineupLinkContext(
  token: string
): Promise<LineupLinkContext | { error: string }> {
  if (await inDemo()) {
    const tokenHash = hashLineupToken(token);
    const link = demoState.links.find((l) => l.token_hash === tokenHash && !l.revoked_at);
    if (!link) return { error: "This link is no longer active. Ask the admin for a new one." };
    link.last_used_at = new Date().toISOString();

    const detail = await getCompetitionDetail(link.tournament_id);
    if ("error" in detail) return { error: detail.error };
    const team = detail.teams.find((t) => t.team_id === link.team_id);
    const roster = await listCompetitionRoster(link.tournament_id, link.team_id);
    if ("error" in roster) return { error: roster.error };
    const competitionDefault = await competitionDefaultCutoff(link.tournament_id);
    const cutoff = effectiveCutoffMinutes(link.cutoff_minutes, competitionDefault);

    const fixtures = (await listCompetitionFixtures(link.tournament_id))
      .filter((f) => f.status === "scheduled")
      .filter((f) => f.home_team_id === link.team_id || f.away_team_id === link.team_id)
      .slice(0, 8);

    const pendingFor = (matchId: string) =>
      demoState.submissions.some(
        (s) => s.match_id === matchId && s.team_id === link.team_id && s.status === "pending"
      );

    return {
      competition: {
        id: detail.competition.id,
        name: detail.competition.name,
        season: detail.competition.season,
        sport_id: detail.competition.sport_id,
      },
      team: { id: link.team_id, name: team?.team_name ?? "Team", logo_url: null, code: null },
      formation: roster.formation,
      starters: startersForMatchSport(detail.competition.sport_id),
      cutoff_minutes: cutoff,
      squad: roster.nominated.map((p) => ({
        player_id: p.player_id,
        first_name: p.first_name,
        last_name: p.last_name,
        position: p.position,
        jersey_number: p.jersey_number,
        is_captain: p.is_captain,
        availability: normaliseAvailability(p.availability),
      })),
      matches: fixtures.map((f) => {
        const home = f.home_team_id === link.team_id;
        const cutoffAt = new Date(new Date(f.scheduled_at).getTime() - cutoff * 60_000).toISOString();
        return {
          id: f.id,
          scheduled_at: f.scheduled_at,
          home,
          opponent: home ? f.away_team_name : f.home_team_name,
          cutoff_at: cutoffAt,
          closed: isSubmissionClosed(f.scheduled_at, cutoff),
          pending: pendingFor(f.id),
        };
      }),
    };
  }

  const supabase = await createClient();
  const { data, error } = await rpcClient(supabase).rpc("lineup_link_context", { p_token: token });
  if (error) return { error: error.message };
  const payload = data as (LineupLinkContext & { error?: string }) | null;
  if (!payload || payload.error) {
    return { error: payload?.error ?? "This link is no longer active." };
  }
  return { ...payload, starters: startersForMatchSport(payload.competition.sport_id) };
}

/* -------------------------------------------------------------------------- */
/* Rep: submit                                                                */
/* -------------------------------------------------------------------------- */

function startersForMatchSport(sportDbId: string): number {
  const sport = dbIdToSport(sportDbId);
  if (sport === "basketball") return 5;
  if (sport === "volleyball") return 6;
  return 11;
}

export async function submitLineupViaLink(input: {
  token: string;
  match_id: string;
  players: SheetEntry[];
  formation?: string | null;
  coach_name?: string | null;
}): Promise<{ ok: true; id: string; warnings: string[] } | { error: string; errors?: string[] }> {
  const context = await getLineupLinkContext(input.token);
  if ("error" in context) return context;

  const match = await fetchMatchById(input.match_id);
  if (!match) return { error: "That match could not be found." };
  const onLink = context.matches.find((m) => m.id === input.match_id);
  if (!onLink) return { error: "That match is not on this link." };
  if (onLink.closed) return { error: "Submissions for this match are closed." };

  const starters = context.starters;
  const squadIds = new Set(context.squad.map((p) => p.player_id));
  const availability = new Map(context.squad.map((p) => [p.player_id, p.availability] as const));

  const requireBench = await tournamentRequiresNamedBench(match.tournament_id);
  const validation = validateLineupSheet({
    players: input.players,
    starters,
    formation: input.formation ?? null,
    squadIds: squadIds.size ? squadIds : null,
    suspendedIds: new Set(),
    availability,
    mode: "rep",
    requireBench,
  });
  if (validation.errors.length) {
    return { error: validation.errors[0], errors: validation.errors };
  }

  if (await inDemo()) {
    const link = demoState.links.find((l) => l.token_hash === hashLineupToken(input.token) && !l.revoked_at);
    if (!link) return { error: "This link is no longer active." };
    for (const s of demoState.submissions) {
      if (s.match_id === input.match_id && s.team_id === link.team_id && s.status === "pending") {
        s.status = "superseded";
      }
    }
    const row: DemoSubmission = {
      id: demoId("sub"),
      match_id: input.match_id,
      team_id: link.team_id,
      link_id: link.id,
      players: input.players,
      formation: input.formation?.trim() || null,
      coach_name: input.coach_name?.trim() || null,
      status: "pending",
      submitted_at: new Date().toISOString(),
    };
    demoState.submissions.push(row);
    link.use_count += 1;
    return { ok: true, id: row.id, warnings: validation.warnings };
  }

  const supabase = await createClient();
  const { data, error } = await rpcClient(supabase).rpc("submit_lineup_via_link", {
    p_token: input.token,
    p_match_id: input.match_id,
    p_players: input.players,
    p_formation: input.formation ?? null,
    p_coach_name: input.coach_name ?? null,
  });
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; id?: string; error?: string } | null;
  if (!payload?.ok || !payload.id) return { error: payload?.error ?? "Submission failed." };
  return { ok: true, id: payload.id, warnings: validation.warnings };
}

/* -------------------------------------------------------------------------- */
/* Staff: review queue                                                        */
/* -------------------------------------------------------------------------- */

export async function listPendingLineupSubmissions(): Promise<PendingLineupSubmission[]> {
  if (await inDemo()) {
    const rows: PendingLineupSubmission[] = [];
    for (const s of demoState.submissions.filter((x) => x.status === "pending")) {
      const match = await fetchMatchById(s.match_id);
      if (!match) continue;
      const team = s.team_id === match.home_team_id ? match.home_team : match.away_team;
      const pool = listDemoRosterPlayers(match.sport_id, s.team_id);
      const nameOf = (id: string) => {
        const p = pool.find((x) => x.id === id);
        return p ? `${p.first_name} ${p.last_name}` : "Unknown player";
      };
      rows.push({
        id: s.id,
        match_id: s.match_id,
        team_id: s.team_id,
        team_name: team?.name ?? "Team",
        match_label: `${match.home_team?.name ?? "Home"} vs ${match.away_team?.name ?? "Away"}`,
        scheduled_at: match.scheduled_at,
        players: s.players.map((p) => ({ ...p, name: nameOf(p.player_id) })),
        formation: s.formation,
        coach_name: s.coach_name,
        submitted_at: s.submitted_at,
      });
    }
    return rows.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("match_lineup_submissions")
    .select(
      "id, match_id, team_id, players, formation, coach_name, submitted_at, team:teams!team_id(name), match:matches!match_id(scheduled_at, home_team:teams!home_team_id(name), away_team:teams!away_team_id(name))"
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true })) as {
    data: Array<{
      id: string;
      match_id: string;
      team_id: string;
      players: SheetEntry[];
      formation: string | null;
      coach_name: string | null;
      submitted_at: string;
      team: { name: string } | null;
      match: {
        scheduled_at: string;
        home_team: { name: string } | null;
        away_team: { name: string } | null;
      } | null;
    }> | null;
  };

  const playerIds = [...new Set((data ?? []).flatMap((r) => (r.players ?? []).map((p) => p.player_id)))];
  const nameById = new Map<string, string>();
  if (playerIds.length) {
    const { data: people } = (await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds)) as {
      data: Array<{ id: string; first_name: string; last_name: string }> | null;
    };
    for (const p of people ?? []) nameById.set(p.id, `${p.first_name} ${p.last_name}`);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    match_id: r.match_id,
    team_id: r.team_id,
    team_name: r.team?.name ?? "Team",
    match_label: `${r.match?.home_team?.name ?? "Home"} vs ${r.match?.away_team?.name ?? "Away"}`,
    scheduled_at: r.match?.scheduled_at ?? r.submitted_at,
    players: (r.players ?? []).map((p) => ({
      ...p,
      name: nameById.get(p.player_id) ?? "Unknown player",
    })),
    formation: r.formation,
    coach_name: r.coach_name,
    submitted_at: r.submitted_at,
  }));
}

export async function reviewLineupSubmission(input: {
  id: string;
  action: "approve" | "reject";
  note?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  if (await inDemo()) {
    const sub = demoState.submissions.find((s) => s.id === input.id);
    if (!sub || sub.status !== "pending") return { error: "Only pending submissions can be reviewed." };
    if (input.action === "reject") {
      sub.status = "rejected";
      return { ok: true };
    }
    const match = await fetchMatchById(sub.match_id);
    const starters = match ? startersForMatchSport(match.sport_id) : 11;
    const requireBench = match ? await tournamentRequiresNamedBench(match.tournament_id) : false;
    const result = await submitMatchLineup({
      match_id: sub.match_id,
      team_id: sub.team_id,
      players: sub.players,
      status: "confirmed",
      coach_name: sub.coach_name,
      formation: sub.formation,
      min_starters: starters,
      require_bench: requireBench,
    });
    if ("error" in result) return result;
    sub.status = "approved";
    return { ok: true };
  }

  const supabase = await createClient();
  const fn = input.action === "approve" ? "approve_lineup_submission" : "reject_lineup_submission";
  const args: Record<string, unknown> =
    input.action === "approve" ? { p_id: input.id } : { p_id: input.id, p_note: input.note ?? null };
  const { data, error } = await rpcClient(supabase).rpc(fn, args);
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) return { error: payload?.error ?? "Review failed." };
  return { ok: true };
}
