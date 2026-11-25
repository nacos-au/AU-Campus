import { createClient } from "@/lib/supabase/server";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { validateGoalAssist } from "@/lib/match/goal-assist";
import {
  createMatchEvent,
  fetchMatchById,
  updateMatch,
  voidMatchEvent,
  fetchMatchEvents,
} from "@/lib/data/repository";

export type ReconcileGoalInput = {
  /** Optional while ops catch up — blank/`?` stored as unknown */
  minute?: number | null;
  team_id: string;
  player_id: string;
  player_name: string;
  event_type: "goal" | "penalty_scored" | "own_goal";
  assist_player_id?: string | null;
  assist_player_name?: string | null;
  solo_goal?: boolean;
  /** Assister not confirmed yet */
  assist_pending?: boolean;
  period?: string;
};

export type ReconcileTeamStatsInput = {
  team_id: string;
  shots_on_target?: number;
  saves?: number;
  corners?: number;
  fouls?: number;
  offsides?: number;
  yellow_cards?: number;
  red_cards?: number;
};

export type ReconcileGkInput = {
  team_id: string;
  /** One or more GKs — all earn CS if this side conceded 0 */
  keepers: Array<{ player_id: string; player_name: string }>;
  /** @deprecated use keepers */
  starter_player_id?: string;
  starter_player_name?: string;
  subs?: Array<{
    minute: number;
    out_player_id: string;
    out_player_name: string;
    in_player_id: string;
    in_player_name: string;
  }>;
};

export type ReconcileMatchInput = {
  home_score: number;
  away_score: number;
  goals: ReconcileGoalInput[];
  /** Allow completing with score only (past comps / incomplete records) */
  allow_score_only?: boolean;
  team_stats?: ReconcileTeamStatsInput[];
  goalkeepers?: ReconcileGkInput[];
  mark_completed?: boolean;
};

function countSideGoals(
  goals: ReconcileGoalInput[],
  homeTeamId: string,
  awayTeamId: string
): { home: number; away: number } {
  let home = 0;
  let away = 0;
  for (const g of goals) {
    if (g.event_type === "own_goal") {
      if (g.team_id === homeTeamId) away += 1;
      else if (g.team_id === awayTeamId) home += 1;
      continue;
    }
    if (g.team_id === homeTeamId) home += 1;
    else if (g.team_id === awayTeamId) away += 1;
  }
  return { home, away };
}

export async function reconcileMatchResult(
  matchId: string,
  input: ReconcileMatchInput
): Promise<{ ok: true } | { error: string }> {
  const match = await fetchMatchById(matchId);
  if (!match) return { error: "Match not found" };
  if (!match.home_team_id || !match.away_team_id) {
    return { error: "Match is missing teams" };
  }

  const homeTeamId = match.home_team_id;
  const awayTeamId = match.away_team_id;
  const scoreOnly = Boolean(input.allow_score_only) && input.goals.length === 0;

  if (!scoreOnly && input.goals.length > 0) {
    for (const g of input.goals) {
      if (!g.player_id) {
        return { error: "Every listed goal needs a scorer (or use score-only mode)." };
      }
      const details: Record<string, unknown> = {
        player_name: g.player_name,
        solo_goal: g.solo_goal === true,
        assist_pending: g.assist_pending === true,
      };
      if (g.assist_player_id) details.assist_player_id = g.assist_player_id;
      if (g.assist_player_name) details.assist_player_name = g.assist_player_name;
      const assistErr = validateGoalAssist(g.event_type, details, { allowPending: true });
      if (assistErr) {
        return {
          error: `${assistErr} (${g.player_name}${g.minute != null ? `, ${g.minute}'` : ""})`,
        };
      }
    }

    const derived = countSideGoals(input.goals, homeTeamId, awayTeamId);
    if (derived.home !== input.home_score || derived.away !== input.away_score) {
      return {
        error: `Goal list (${derived.home}-${derived.away}) does not match entered score (${input.home_score}-${input.away_score}).`,
      };
    }
  }

  if (!scoreOnly && input.goals.length === 0 && (input.home_score > 0 || input.away_score > 0)) {
    return {
      error:
        "Add goal rows, or enable score-only to save the final score without scorers yet.",
    };
  }

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return { error: "Reconcile requires live Supabase (not demo mode)." };
  }

  // Void existing non-shootout scoring events so recompute matches the new list.
  const existing = await fetchMatchEvents(matchId);
  for (const ev of existing) {
    if (ev.period === "penalty_shootout") continue;
    if (!["goal", "penalty_scored", "own_goal"].includes(ev.event_type)) continue;
    const voided = await voidMatchEvent(matchId, ev.id);
    if ("error" in voided) return voided;
  }

  for (const g of input.goals) {
    const minuteUnknown = g.minute == null || Number.isNaN(Number(g.minute));
    const minute = minuteUnknown ? null : Number(g.minute);
    const details: Record<string, unknown> = {
      player_name: g.player_name,
      team_id: g.team_id,
      solo_goal: g.event_type === "goal" ? g.solo_goal === true : false,
      assist_pending: g.event_type === "goal" ? g.assist_pending === true : false,
      minute_unknown: minuteUnknown,
    };
    if (g.assist_player_id) details.assist_player_id = g.assist_player_id;
    if (g.assist_player_name) details.assist_player_name = g.assist_player_name;

    const created = await createMatchEvent({
      match_id: matchId,
      team_id: g.team_id,
      player_id: g.player_id,
      event_type: g.event_type,
      period:
        g.period ??
        (minute != null ? (minute <= 45 ? "half_1" : "half_2") : "full_time"),
      match_time: minute != null ? String(minute) : "",
      details,
    });
    if ("error" in created) return created;
  }

  if (input.goalkeepers?.length) {
    const supabase = await createClient();
    for (const gk of input.goalkeepers) {
      const { data: existingLineup } = (await supabase
        .from("match_lineups")
        .select("players")
        .eq("match_id", matchId)
        .eq("team_id", gk.team_id)
        .maybeSingle()) as {
        data: { players: Array<Record<string, unknown>> | null } | null;
      };

      const prev = Array.isArray(existingLineup?.players) ? existingLineup!.players! : [];
      const withoutGk = prev.filter((p) => String(p.role ?? "").toUpperCase() !== "GK");
      const keepers =
        gk.keepers?.length
          ? gk.keepers
          : gk.starter_player_id
            ? [
                {
                  player_id: gk.starter_player_id,
                  player_name: gk.starter_player_name ?? "GK",
                },
              ]
            : [];
      if (!keepers.length) continue;
      const players = [
        ...keepers.map((k) => ({
          player_id: k.player_id,
          player_name: k.player_name,
          is_starting: true,
          role: "GK",
        })),
        ...withoutGk,
      ];

      const { error: lineupErr } = (await (
        supabase.from("match_lineups") as ReturnType<typeof supabase.from>
      ).upsert(
        {
          match_id: matchId,
          team_id: gk.team_id,
          players,
          status: "confirmed",
          submitted_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        } as Record<string, unknown>,
        { onConflict: "match_id,team_id" }
      )) as { error: { message: string } | null };

      if (lineupErr) return { error: lineupErr.message };

      for (const sub of gk.subs ?? []) {
        const subEvent = await createMatchEvent({
          match_id: matchId,
          team_id: gk.team_id,
          player_id: sub.out_player_id,
          event_type: "substitution",
          period: sub.minute <= 45 ? "half_1" : "half_2",
          match_time: String(sub.minute),
          details: {
            player_out_id: sub.out_player_id,
            player_out_name: sub.out_player_name,
            player_in_id: sub.in_player_id,
            player_in_name: sub.in_player_name,
            gk_sub: true,
          },
        });
        if ("error" in subEvent) return subEvent;
      }
    }
  }

  if (input.team_stats?.length) {
    const supabase = await createClient();
    for (const row of input.team_stats) {
      const { error } = await (supabase.from("match_team_stats") as ReturnType<typeof supabase.from>).upsert(
        {
          match_id: matchId,
          team_id: row.team_id,
          shots_on_target: row.shots_on_target ?? 0,
          saves: row.saves ?? 0,
          corners: row.corners ?? 0,
          fouls: row.fouls ?? 0,
          offsides: row.offsides ?? 0,
          yellow_cards: row.yellow_cards ?? 0,
          red_cards: row.red_cards ?? 0,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>,
        { onConflict: "match_id,team_id" }
      );
      if (error) return { error: error.message };
    }
  }

  const complete = input.mark_completed !== false;
  const patched = await updateMatch(matchId, {
    home_score: input.home_score,
    away_score: input.away_score,
    ...(complete
      ? { status: "completed" as const, current_period: "full_time" }
      : {}),
  });
  if ("error" in patched) return patched;

  return { ok: true };
}
