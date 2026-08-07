import { FOOTBALL_POINTS } from "@/lib/competition/football-points";
import {
  goalsToWinForSet,
  suggestMiniLeagueStructure,
} from "@/lib/phantom/formats";
import type {
  CreatePhantomInput,
  PhantomEvent,
  PhantomMatch,
  PhantomSession,
  PhantomSettings,
  PhantomStandingRow,
  PhantomTeam,
} from "@/lib/phantom/types";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

function shareCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function roundRobinPairs(teamIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.push([teamIds[i]!, teamIds[j]!]);
    }
  }
  return pairs;
}

const GROUP_LETTERS = "ABCDEFGHIJKLMNOP";

function assignGroupsOf4(teams: PhantomTeam[]): PhantomTeam[] {
  return teams.map((t, i) => ({
    ...t,
    group: GROUP_LETTERS[Math.floor(i / 4)] ?? "X",
  }));
}

function makeMatch(
  index: number,
  home: string,
  away: string,
  opts?: { live?: boolean; set_number?: number; group?: string | null }
): PhantomMatch {
  return {
    id: uid("pm"),
    index,
    home_team_id: home,
    away_team_id: away,
    home_score: 0,
    away_score: 0,
    home_sets: 0,
    away_sets: 0,
    status: opts?.live ? "live" : "scheduled",
    current_period: 1,
    set_number: opts?.set_number,
    group: opts?.group ?? null,
  };
}

export function buildMatches(settings: PhantomSettings): PhantomMatch[] {
  const teams = settings.teams;

  if (settings.format === "sets" && teams.length >= 3) {
    const home = teams[0]!.id;
    const away = teams[1]!.id;
    return [makeMatch(0, home, away, { live: true, set_number: 1 })];
  }

  if (settings.format === "mini_league" && teams.length >= 3) {
    const structure =
      settings.mini_league_structure ?? suggestMiniLeagueStructure(teams.length) ?? "single_table";

    if (structure === "groups_of_4") {
      const grouped = assignGroupsOf4(teams);
      const byGroup = new Map<string, string[]>();
      for (const t of grouped) {
        const g = t.group ?? "A";
        const list = byGroup.get(g) ?? [];
        list.push(t.id);
        byGroup.set(g, list);
      }
      const matches: PhantomMatch[] = [];
      let index = 0;
      for (const [group, ids] of byGroup) {
        for (const [home, away] of roundRobinPairs(ids)) {
          matches.push(
            makeMatch(index, home, away, { live: index === 0, group })
          );
          index++;
        }
      }
      return matches;
    }

    return roundRobinPairs(teams.map((t) => t.id)).map(([home, away], index) =>
      makeMatch(index, home, away, { live: index === 0 })
    );
  }

  const home = teams[0]?.id ?? "team-a";
  const away = teams[1]?.id ?? "team-b";
  return [
    {
      ...makeMatch(0, home, away, { live: true }),
      home_penalties: settings.format === "penalties" ? 0 : undefined,
      away_penalties: settings.format === "penalties" ? 0 : undefined,
    },
  ];
}

export function createPhantomSession(input: CreatePhantomInput): PhantomSession {
  let settings = input.settings;
  if (settings.format === "mini_league") {
    const structure =
      settings.mini_league_structure ??
      suggestMiniLeagueStructure(settings.teams.length) ??
      "single_table";
    const teams =
      structure === "groups_of_4" ? assignGroupsOf4(settings.teams) : settings.teams;
    settings = { ...settings, mini_league_structure: structure, teams };
  }

  const matches = buildMatches(settings);
  const title =
    input.title?.trim() ||
    `${settings.teams.map((t) => t.name).join(" · ")} · Phantom`;

  const rotation_queue =
    settings.format === "sets" ? settings.teams.map((t) => t.id) : undefined;

  return {
    id: uid("phantom"),
    code: shareCode(),
    status: "live",
    settings,
    matches,
    events: [],
    active_match_id: matches[0]?.id ?? null,
    standings: emptyStandings(settings),
    created_at: new Date().toISOString(),
    concluded_at: null,
    title,
    rotation_queue,
    next_set_number: settings.format === "sets" ? 2 : undefined,
  };
}

function emptyStandings(settings: PhantomSettings): PhantomStandingRow[] {
  return settings.teams.map((t) => ({
    team_id: t.id,
    team_name: t.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    points: 0,
    group: t.group ?? null,
  }));
}

/** Football / league: Win 3, Draw 1, Loss 0. Beatrice sets: points = sets won. */
export function computeStandings(session: PhantomSession): PhantomStandingRow[] {
  const rows = new Map(emptyStandings(session.settings).map((r) => [r.team_id, { ...r }]));
  const isBeatrice = session.settings.format === "sets";

  for (const m of session.matches) {
    if (m.status !== "completed") continue;
    const home = rows.get(m.home_team_id);
    const away = rows.get(m.away_team_id);
    if (!home || !away) continue;

    const hs =
      session.settings.scoring_mode === "penalties"
        ? (m.home_penalties ?? 0)
        : m.home_score;
    const as =
      session.settings.scoring_mode === "penalties"
        ? (m.away_penalties ?? 0)
        : m.away_score;

    home.played++;
    away.played++;
    home.goals_for += hs;
    home.goals_against += as;
    away.goals_for += as;
    away.goals_against += hs;

    if (hs > as) {
      home.won++;
      away.lost++;
      home.points += isBeatrice ? 1 : FOOTBALL_POINTS.win;
    } else if (as > hs) {
      away.won++;
      home.lost++;
      away.points += isBeatrice ? 1 : FOOTBALL_POINTS.win;
    } else {
      home.drawn++;
      away.drawn++;
      if (!isBeatrice) {
        home.points += FOOTBALL_POINTS.draw;
        away.points += FOOTBALL_POINTS.draw;
      }
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goals_for - b.goals_against - (a.goals_for - a.goals_against) ||
      b.goals_for - a.goals_for
  );
}

function rotateWinnerStays(
  queue: string[],
  winnerId: string,
  loserId: string
): { home: string; away: string; queue: string[] } {
  const rest = queue.filter((id) => id !== winnerId && id !== loserId);
  const nextChallenger = rest[0];
  const remainder = rest.slice(1);
  const newQueue = [winnerId, ...(nextChallenger ? [nextChallenger] : []), ...remainder, loserId];
  return {
    home: winnerId,
    away: nextChallenger ?? loserId,
    queue: newQueue,
  };
}

function rotateBothLeave(queue: string[], a: string, b: string): {
  home: string;
  away: string;
  queue: string[];
} {
  const rest = queue.filter((id) => id !== a && id !== b);
  const newQueue = [...rest, a, b];
  return {
    home: newQueue[0]!,
    away: newQueue[1]!,
    queue: newQueue,
  };
}

function startNextBeatriceSet(
  session: PhantomSession,
  home: string,
  away: string,
  queue: string[],
  setNumber: number
): PhantomSession {
  const match = makeMatch(session.matches.length, home, away, {
    live: true,
    set_number: setNumber,
  });
  const matches = [
    ...session.matches.map((m) =>
      m.status === "live" ? { ...m, status: "completed" as const } : m
    ),
    match,
  ];
  const next: PhantomSession = {
    ...session,
    matches,
    active_match_id: match.id,
    rotation_queue: queue,
    next_set_number: setNumber + 1,
    status: "live",
    standings: [],
  };
  next.standings = computeStandings(next);
  return next;
}

/**
 * End current Beatrice set. If decisive (winner), winner stays.
 * If draw (time expired level), both leave.
 */
export function endBeatriceSet(
  session: PhantomSession,
  matchId: string,
  reason: "goal_threshold" | "time_draw"
): PhantomSession {
  if (session.settings.format !== "sets") return session;
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

  const completed: PhantomMatch = { ...match, status: "completed" };
  const matches = session.matches.map((m) => (m.id === matchId ? completed : m));
  let next: PhantomSession = {
    ...session,
    matches,
    standings: [],
  };
  next.standings = computeStandings(next);

  const queue = session.rotation_queue ?? session.settings.teams.map((t) => t.id);
  const setNumber = session.next_set_number ?? (match.set_number ?? 1) + 1;

  if (reason === "time_draw" || completed.home_score === completed.away_score) {
    const rot = rotateBothLeave(queue, completed.home_team_id, completed.away_team_id);
    return startNextBeatriceSet(next, rot.home, rot.away, rot.queue, setNumber);
  }

  const winnerId =
    completed.home_score > completed.away_score
      ? completed.home_team_id
      : completed.away_team_id;
  const loserId =
    winnerId === completed.home_team_id
      ? completed.away_team_id
      : completed.home_team_id;
  const rot = rotateWinnerStays(queue, winnerId, loserId);
  return startNextBeatriceSet(next, rot.home, rot.away, rot.queue, setNumber);
}

export function logGoal(
  session: PhantomSession,
  matchId: string,
  teamId: string,
  playerName: string,
  assistName: string | null,
  clockLabel: string
): PhantomSession {
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

  const event: PhantomEvent = {
    id: uid("ev"),
    match_id: matchId,
    team_id: teamId,
    type: "goal",
    player_name: playerName.trim() || "Unknown",
    assist_name: assistName?.trim() || null,
    period: match.current_period,
    clock_label: clockLabel,
    created_at: new Date().toISOString(),
  };

  const matches = session.matches.map((m) => {
    if (m.id !== matchId) return m;
    const home_score = m.home_team_id === teamId ? m.home_score + 1 : m.home_score;
    const away_score = m.away_team_id === teamId ? m.away_score + 1 : m.away_score;
    return { ...m, home_score, away_score };
  });

  let next: PhantomSession = {
    ...session,
    matches,
    events: [event, ...session.events],
  };

  const updated = next.matches.find((m) => m.id === matchId)!;

  if (session.settings.format === "sets") {
    const need = goalsToWinForSet(session.settings, updated.set_number ?? 1);
    if (updated.home_score >= need || updated.away_score >= need) {
      return endBeatriceSet(next, matchId, "goal_threshold");
    }
    return next;
  }

  const target = session.settings.goal_target;
  if (
    session.settings.scoring_mode === "goals_only" &&
    target &&
    (updated.home_score >= target || updated.away_score >= target)
  ) {
    next = completeMatch(next, matchId);
  }

  return next;
}

export function logPenalty(
  session: PhantomSession,
  matchId: string,
  teamId: string,
  playerName: string,
  scored: boolean
): PhantomSession {
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

  const event: PhantomEvent = {
    id: uid("ev"),
    match_id: matchId,
    team_id: teamId,
    type: scored ? "penalty_scored" : "penalty_missed",
    player_name: playerName.trim() || "Unknown",
    period: match.current_period,
    clock_label: "PEN",
    created_at: new Date().toISOString(),
  };

  const matches = session.matches.map((m) => {
    if (m.id !== matchId) return m;
    const home_penalties =
      scored && m.home_team_id === teamId ? (m.home_penalties ?? 0) + 1 : (m.home_penalties ?? 0);
    const away_penalties =
      scored && m.away_team_id === teamId ? (m.away_penalties ?? 0) + 1 : (m.away_penalties ?? 0);
    return { ...m, home_penalties, away_penalties, home_score: home_penalties, away_score: away_penalties };
  });

  return { ...session, matches, events: [event, ...session.events] };
}

/** @deprecated Prefer Beatrice endBeatriceSet — kept for older session UI paths */
export function winSet(
  session: PhantomSession,
  matchId: string,
  teamId: string
): PhantomSession {
  if (session.settings.format === "sets") {
    const match = session.matches.find((m) => m.id === matchId);
    if (!match || match.status !== "live") return session;
    const matches = session.matches.map((m) => {
      if (m.id !== matchId) return m;
      const home_score = m.home_team_id === teamId ? Math.max(m.home_score, 1) : m.home_score;
      const away_score = m.away_team_id === teamId ? Math.max(m.away_score, 1) : m.away_score;
      return { ...m, home_score, away_score };
    });
    return endBeatriceSet({ ...session, matches }, matchId, "goal_threshold");
  }
  return session;
}

export function advancePeriod(session: PhantomSession, matchId: string): PhantomSession {
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

  if (session.settings.format === "sets") {
    return endBeatriceSet(session, matchId, "time_draw");
  }

  if (match.current_period >= session.settings.period_count) {
    return completeMatch(session, matchId);
  }

  return {
    ...session,
    matches: session.matches.map((m) =>
      m.id === matchId ? { ...m, current_period: m.current_period + 1 } : m
    ),
  };
}

export function completeMatch(session: PhantomSession, matchId: string): PhantomSession {
  const matches = session.matches.map((m) =>
    m.id === matchId ? { ...m, status: "completed" as const } : m
  );
  const nextScheduled = matches.find((m) => m.status === "scheduled");
  const withNext = nextScheduled
    ? matches.map((m) => (m.id === nextScheduled.id ? { ...m, status: "live" as const } : m))
    : matches;

  const next: PhantomSession = {
    ...session,
    matches: withNext,
    active_match_id: nextScheduled?.id ?? matchId,
    standings: [],
  };
  next.standings = computeStandings(next);

  const allDone = next.matches.every((m) => m.status === "completed");
  if (allDone) {
    return {
      ...next,
      status: "completed",
      concluded_at: new Date().toISOString(),
      active_match_id: null,
    };
  }
  return { ...next, status: "live" };
}

export function concludeSession(session: PhantomSession): PhantomSession {
  const matches = session.matches.map((m) =>
    m.status === "live" ? { ...m, status: "completed" as const } : m
  );
  const next: PhantomSession = {
    ...session,
    matches,
    status: "completed",
    concluded_at: new Date().toISOString(),
    active_match_id: null,
    standings: [],
  };
  next.standings = computeStandings(next);
  return next;
}

export function teamName(session: PhantomSession, teamId: string): string {
  return session.settings.teams.find((t) => t.id === teamId)?.name ?? "Team";
}
