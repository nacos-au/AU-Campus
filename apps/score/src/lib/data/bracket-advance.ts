import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import {
  knockoutRoundLabel,
  nextBracketSlot,
  nextKnockoutRound,
} from "@/lib/competition/competition-builder";

type BracketRow = {
  id: string;
  tournament_id: string;
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
  sort_order: number;
};

type MatchRow = {
  id: string;
  tournament_id: string | null;
  sport_id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  home_penalties: number | null;
  away_penalties: number | null;
  status: string;
};

function resolveWinner(match: MatchRow): { teamId: string; displayName: string } | null {
  const hp = match.home_penalties;
  const ap = match.away_penalties;
  if (hp != null && ap != null && hp !== ap) {
    return hp > ap
      ? { teamId: match.home_team_id, displayName: "Home" }
      : { teamId: match.away_team_id, displayName: "Away" };
  }
  if (match.home_score === match.away_score) return null;
  return match.home_score > match.away_score
    ? { teamId: match.home_team_id, displayName: "Home" }
    : { teamId: match.away_team_id, displayName: "Away" };
}

async function teamName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<string> {
  const { data } = (await supabase.from("teams").select("name").eq("id", teamId).maybeSingle()) as {
    data: { name: string } | null;
  };
  return data?.name ?? "TBD";
}

/**
 * After a knockout tie completes, copy the winner into the next round slot.
 * Creates the next-round match once both sides are filled.
 */
export async function advanceBracketAfterMatchComplete(
  matchId: string
): Promise<{ ok: true; advanced?: boolean } | { error: string }> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { ok: true, advanced: false };
  }

  const supabase = await createClient();
  const { data: match } = (await supabase
    .from("matches")
    .select(
      "id, tournament_id, sport_id, home_team_id, away_team_id, home_score, away_score, home_penalties, away_penalties, status"
    )
    .eq("id", matchId)
    .maybeSingle()) as { data: MatchRow | null };

  if (!match || match.status !== "completed" || !match.tournament_id) {
    return { ok: true, advanced: false };
  }

  const { data: fixture } = (await supabase
    .from("bracket_fixtures")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle()) as { data: BracketRow | null };

  if (!fixture) return { ok: true, advanced: false };

  const winner = resolveWinner(match);
  if (!winner) return { ok: true, advanced: false };

  const name = await teamName(supabase, winner.teamId);

  await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
    .update({
      home_score: match.home_score,
      away_score: match.away_score,
      home_penalties: match.home_penalties,
      away_penalties: match.away_penalties,
      status: "completed",
    } as Record<string, unknown>)
    .eq("id", fixture.id);

  const nextRound = nextKnockoutRound(fixture.round);
  if (!nextRound) return { ok: true, advanced: true };

  const slot = nextBracketSlot(fixture.sort_order);
  const nextLabel = knockoutRoundLabel(nextRound);

  const { data: nextExisting } = (await supabase
    .from("bracket_fixtures")
    .select("*")
    .eq("tournament_id", fixture.tournament_id)
    .eq("round", nextRound)
    .eq("sort_order", slot.position)
    .maybeSingle()) as { data: BracketRow | null };

  const sidePatch =
    slot.side === "home"
      ? { home_team_id: winner.teamId, home_display_name: name }
      : { away_team_id: winner.teamId, away_display_name: name };

  let nextId = nextExisting?.id ?? null;
  let homeId = nextExisting?.home_team_id ?? null;
  let awayId = nextExisting?.away_team_id ?? null;
  let homeName = nextExisting?.home_display_name ?? null;
  let awayName = nextExisting?.away_display_name ?? null;

  if (slot.side === "home") {
    homeId = winner.teamId;
    homeName = name;
  } else {
    awayId = winner.teamId;
    awayName = name;
  }

  if (nextExisting) {
    await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
      .update(sidePatch as Record<string, unknown>)
      .eq("id", nextExisting.id);
  } else {
    const { data: inserted } = (await (
      supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>
    )
      .insert({
        tournament_id: fixture.tournament_id,
        round: nextRound,
        round_label: nextLabel,
        home_team_id: homeId,
        away_team_id: awayId,
        home_display_name: homeName ?? "TBD",
        away_display_name: awayName ?? "TBD",
        status: "scheduled",
        bracket_mode: "team",
        sort_order: slot.position,
      } as Record<string, unknown>)
      .select("id")
      .single()) as { data: { id: string } | null };
    nextId = inserted?.id ?? null;
  }

  // Both sides known and no match yet → create the next fixture.
  if (nextId && homeId && awayId) {
    const { data: current } = (await supabase
      .from("bracket_fixtures")
      .select("match_id")
      .eq("id", nextId)
      .maybeSingle()) as { data: { match_id: string | null } | null };

    if (!current?.match_id) {
      const { data: newMatch } = (await (
        supabase.from("matches") as ReturnType<typeof supabase.from>
      )
        .insert({
          tournament_id: fixture.tournament_id,
          sport_id: match.sport_id,
          home_team_id: homeId,
          away_team_id: awayId,
          status: "scheduled",
          current_period: "not_started",
          home_score: 0,
          away_score: 0,
          scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          scope: "official",
          competition_phase: nextRound,
        } as Record<string, unknown>)
        .select("id")
        .single()) as { data: { id: string } | null };

      if (newMatch?.id) {
        await (supabase.from("bracket_fixtures") as ReturnType<typeof supabase.from>)
          .update({ match_id: newMatch.id } as Record<string, unknown>)
          .eq("id", nextId);
      }
    }
  }

  return { ok: true, advanced: true };
}
