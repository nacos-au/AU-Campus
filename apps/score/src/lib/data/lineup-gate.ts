import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import { getCompetitionDetail } from "@/lib/data/competition-rosters";
import { listDemoTournamentRosters } from "@/lib/data/demo-competitions-store";

/** Minimum starting XI / five / six by sport slug. Track & tennis skip the gate. */
export function defaultStartersForSport(sportSlug: string | null | undefined): number {
  switch (sportSlug) {
    case "football":
      return 11;
    case "basketball":
      return 5;
    case "volleyball":
      return 6;
    default:
      return 0;
  }
}

export function startersFromConfig(
  config: Record<string, unknown> | null | undefined,
  sportSlug: string | null | undefined
): number {
  const fromConfig = Number(config?.starters);
  if (Number.isFinite(fromConfig) && fromConfig > 0) return Math.floor(fromConfig);
  return defaultStartersForSport(sportSlug);
}

function teamLabel(name: string | null | undefined, fallback: string): string {
  return name?.trim() || fallback;
}

/**
 * Ensure both sides have enough competition-roster players (or confirmed lineup
 * starters when present) before scheduling / kicking off a refereable fixture.
 */
export async function assertSidesHaveMinStarters(input: {
  tournamentId: string | null | undefined;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName?: string | null;
  awayTeamName?: string | null;
  sportSlug?: string | null;
  /** Prefer confirmed match lineup starter counts when checking kick-off. */
  matchId?: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const tournamentId = input.tournamentId?.trim();
  if (!tournamentId) return { ok: true };

  const detail = await getCompetitionDetail(tournamentId);
  if ("error" in detail) {
    // No competition metadata — don't block friendlies / orphan fixtures.
    return { ok: true };
  }

  const sportSlug =
    input.sportSlug ??
    (typeof detail.competition.config?.sport_slug === "string"
      ? detail.competition.config.sport_slug
      : null);

  // Resolve slug from sports table when config lacks it.
  let resolvedSlug = sportSlug;
  if (!resolvedSlug && hasSupabaseConfig() && !(await getScoreDemoMode())) {
    const supabase = await createClient();
    const { data } = (await supabase
      .from("sports")
      .select("slug")
      .eq("id", detail.competition.sport_id)
      .maybeSingle()) as { data: { slug: string } | null };
    resolvedSlug = data?.slug ?? null;
  }

  if (!resolvedSlug && detail.competition.sport_id.includes("football")) {
    resolvedSlug = "football";
  } else if (!resolvedSlug && detail.competition.sport_id.includes("basketball")) {
    resolvedSlug = "basketball";
  } else if (!resolvedSlug && detail.competition.sport_id.includes("volleyball")) {
    resolvedSlug = "volleyball";
  } else if (
    !resolvedSlug &&
    (detail.competition.sport_id.includes("track") ||
      detail.competition.sport_id.includes("tennis"))
  ) {
    return { ok: true };
  }

  const required = startersFromConfig(detail.competition.config, resolvedSlug);
  if (required <= 0) return { ok: true };

  const homeMeta = detail.teams.find((t) => t.team_id === input.homeTeamId);
  const awayMeta = detail.teams.find((t) => t.team_id === input.awayTeamId);
  const homeName = teamLabel(input.homeTeamName ?? homeMeta?.team_name, "Home");
  const awayName = teamLabel(input.awayTeamName ?? awayMeta?.team_name, "Away");

  let homeCount = homeMeta?.roster_count ?? 0;
  let awayCount = awayMeta?.roster_count ?? 0;

  // Demo fallback when competition detail has no team rows yet.
  if ((!homeMeta || !awayMeta) && (await inDemo())) {
    const rows = listDemoTournamentRosters(tournamentId);
    homeCount = rows.filter((r) => r.team_id === input.homeTeamId).length;
    awayCount = rows.filter((r) => r.team_id === input.awayTeamId).length;
  }

  // Prefer match lineup starters when a sheet exists; otherwise competition roster size.
  if (input.matchId) {
    const sheets = await countMatchLineupStarters(input.matchId, [
      input.homeTeamId,
      input.awayTeamId,
    ]);
    if (sheets[input.homeTeamId]?.hasSheet) {
      homeCount = sheets[input.homeTeamId]!.starters;
    }
    if (sheets[input.awayTeamId]?.hasSheet) {
      awayCount = sheets[input.awayTeamId]!.starters;
    }
  }

  if (homeCount < required) {
    return {
      error: `${homeName} has ${homeCount}/${required} players — fill the competition squad before scheduling/starting.`,
    };
  }
  if (awayCount < required) {
    return {
      error: `${awayName} has ${awayCount}/${required} players — fill the competition squad before scheduling/starting.`,
    };
  }
  return { ok: true };
}

async function inDemo(): Promise<boolean> {
  return !hasSupabaseConfig() || (await getScoreDemoMode());
}

async function countMatchLineupStarters(
  matchId: string,
  teamIds: string[]
): Promise<Record<string, { hasSheet: boolean; starters: number }>> {
  const out: Record<string, { hasSheet: boolean; starters: number }> = {};
  for (const id of teamIds) out[id] = { hasSheet: false, starters: 0 };

  if (await inDemo()) {
    return out;
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("match_lineups")
    .select("team_id, players")
    .eq("match_id", matchId)
    .in("team_id", teamIds)) as {
    data: { team_id: string; players: { is_starting?: boolean }[] | null }[] | null;
  };

  for (const row of data ?? []) {
    const starters = (row.players ?? []).filter((p) => p.is_starting).length;
    out[row.team_id] = { hasSheet: true, starters };
  }
  return out;
}
