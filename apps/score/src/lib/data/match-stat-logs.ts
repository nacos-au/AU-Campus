import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import { resolveSportUuid } from "@/lib/data/sport-ids";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

export type MatchLogGoalType = "goal" | "penalty" | "own_goal";
export type MatchLogCardType = "yellow" | "red";

export type MatchLogGoal = {
  minute: string;
  type: MatchLogGoalType;
  side: "home" | "away";
  scorer_name: string;
  scorer_id?: string | null;
  assist_name?: string | null;
  assist_id?: string | null;
  solo?: boolean;
};

export type MatchLogCard = {
  minute: string;
  type: MatchLogCardType;
  side: "home" | "away";
  player_name: string;
  player_id?: string | null;
};

export type MatchLogGk = {
  player_id?: string | null;
  player_name: string;
};

export type MatchLogPayload = {
  goals_nil?: boolean;
  cards_nil?: boolean;
  goalkeepers?: { home?: MatchLogGk | null; away?: MatchLogGk | null };
  goals?: MatchLogGoal[];
  cards?: MatchLogCard[];
  notes?: string;
};

export type MatchStatLog = {
  id: string;
  sport_id: string;
  tournament_id: string | null;
  match_id: string | null;
  season: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_score: number | null;
  away_score: number | null;
  scheduled_at: string | null;
  payload: MatchLogPayload;
  created_at: string;
  updated_at: string;
};

export type UpsertMatchStatLogInput = {
  id?: string;
  sport: SportId;
  tournament_id?: string | null;
  match_id?: string | null;
  season?: string;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  home_score?: number | null;
  away_score?: number | null;
  scheduled_at?: string | null;
  payload?: MatchLogPayload;
};

type LogRow = Omit<MatchStatLog, "payload"> & { payload: MatchLogPayload | null };

function mapRow(row: LogRow): MatchStatLog {
  return {
    ...row,
    payload: row.payload ?? {},
  };
}

/** In-memory demo notepad when Supabase is off */
let demoLogs: MatchStatLog[] = [];

export async function listMatchStatLogs(opts: {
  sport: SportId;
  tournamentId?: string | null;
  season?: string | null;
}): Promise<MatchStatLog[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return demoLogs
      .filter((l) => {
        if (opts.tournamentId && l.tournament_id !== opts.tournamentId) return false;
        if (opts.season && l.season !== opts.season) return false;
        return true;
      })
      .sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return tb - ta;
      });
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, sportToDbId(opts.sport));
  if (typeof sportUuid !== "string") return [];

  let q = supabase
    .from("match_stat_logs")
    .select("*")
    .eq("sport_id", sportUuid)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  if (opts.tournamentId) q = q.eq("tournament_id", opts.tournamentId);
  if (opts.season) q = q.eq("season", opts.season);

  const { data, error } = (await q) as { data: LogRow[] | null; error: { message: string } | null };
  if (error) {
    console.error("[match-stat-logs] list failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}

export async function getMatchStatLog(id: string): Promise<MatchStatLog | null> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return demoLogs.find((l) => l.id === id) ?? null;
  }
  const supabase = await createClient();
  const { data } = (await supabase
    .from("match_stat_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: LogRow | null };
  return data ? mapRow(data) : null;
}

export async function upsertMatchStatLog(
  input: UpsertMatchStatLogInput,
  userId?: string | null
): Promise<{ id: string } | { error: string }> {
  const now = new Date().toISOString();
  const payload = input.payload ?? {};

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    if (input.id) {
      const idx = demoLogs.findIndex((l) => l.id === input.id);
      if (idx < 0) return { error: "Log not found" };
      demoLogs[idx] = {
        ...demoLogs[idx],
        tournament_id: input.tournament_id ?? demoLogs[idx].tournament_id,
        match_id: input.match_id ?? demoLogs[idx].match_id,
        season: input.season ?? demoLogs[idx].season,
        home_team_id: input.home_team_id ?? demoLogs[idx].home_team_id,
        away_team_id: input.away_team_id ?? demoLogs[idx].away_team_id,
        home_team_name: input.home_team_name ?? demoLogs[idx].home_team_name,
        away_team_name: input.away_team_name ?? demoLogs[idx].away_team_name,
        home_score: input.home_score ?? demoLogs[idx].home_score,
        away_score: input.away_score ?? demoLogs[idx].away_score,
        scheduled_at: input.scheduled_at ?? demoLogs[idx].scheduled_at,
        payload,
        updated_at: now,
      };
      return { id: input.id };
    }
    const id = `msl-demo-${Date.now().toString(36)}`;
    demoLogs = [
      {
        id,
        sport_id: sportToDbId(input.sport),
        tournament_id: input.tournament_id ?? null,
        match_id: input.match_id ?? null,
        season: input.season ?? "2026/27",
        home_team_id: input.home_team_id ?? null,
        away_team_id: input.away_team_id ?? null,
        home_team_name: input.home_team_name ?? null,
        away_team_name: input.away_team_name ?? null,
        home_score: input.home_score ?? null,
        away_score: input.away_score ?? null,
        scheduled_at: input.scheduled_at ?? now,
        payload,
        created_at: now,
        updated_at: now,
      },
      ...demoLogs,
    ];
    return { id };
  }

  const supabase = await createClient();
  const sportUuid = await resolveSportUuid(supabase, sportToDbId(input.sport));
  if (typeof sportUuid !== "string") return { error: "Sport not found" };

  if (input.id) {
    const { error } = (await (
      supabase.from("match_stat_logs") as ReturnType<typeof supabase.from>
    ).update({
      tournament_id: input.tournament_id ?? null,
      match_id: input.match_id ?? null,
      season: input.season ?? "2026/27",
      home_team_id: input.home_team_id ?? null,
      away_team_id: input.away_team_id ?? null,
      home_team_name: input.home_team_name ?? null,
      away_team_name: input.away_team_name ?? null,
      home_score: input.home_score ?? null,
      away_score: input.away_score ?? null,
      scheduled_at: input.scheduled_at ?? null,
      payload,
      updated_by: userId ?? null,
      updated_at: now,
    } as Record<string, unknown>).eq("id", input.id)) as {
      error: { message: string } | null;
    };
    if (error) return { error: error.message };
    return { id: input.id };
  }

  const { data, error } = (await (
    supabase.from("match_stat_logs") as ReturnType<typeof supabase.from>
  )
    .insert({
      sport_id: sportUuid,
      tournament_id: input.tournament_id ?? null,
      match_id: input.match_id ?? null,
      season: input.season ?? "2026/27",
      home_team_id: input.home_team_id ?? null,
      away_team_id: input.away_team_id ?? null,
      home_team_name: input.home_team_name ?? null,
      away_team_name: input.away_team_name ?? null,
      home_score: input.home_score ?? null,
      away_score: input.away_score ?? null,
      scheduled_at: input.scheduled_at ?? now,
      payload,
      created_by: userId ?? null,
      updated_by: userId ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Could not create log" };
  return { id: data.id };
}
