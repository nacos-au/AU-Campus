import type {
  CreatePhantomInput,
  PhantomEvent,
  PhantomMatch,
  PhantomSession,
  PhantomSettings,
  PhantomStandingRow,
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

export function buildMatches(settings: PhantomSettings): PhantomMatch[] {
  const teams = settings.teams;
  if (settings.format === "mini_league" && teams.length >= 3) {
    return roundRobinPairs(teams.map((t) => t.id)).map(([home, away], index) => ({
      id: uid("pm"),
      index,
      home_team_id: home,
      away_team_id: away,
      home_score: 0,
      away_score: 0,
      home_sets: 0,
      away_sets: 0,
      status: index === 0 ? "live" : "scheduled",
      current_period: 1,
    }));
  }

  const home = teams[0]?.id ?? "team-a";
  const away = teams[1]?.id ?? "team-b";
  return [
    {
      id: uid("pm"),
      index: 0,
      home_team_id: home,
      away_team_id: away,
      home_score: 0,
      away_score: 0,
      home_sets: 0,
      away_sets: 0,
      status: "live",
      current_period: 1,
      home_penalties: settings.format === "penalties" ? 0 : undefined,
      away_penalties: settings.format === "penalties" ? 0 : undefined,
    },
  ];
}

export function createPhantomSession(input: CreatePhantomInput): PhantomSession {
  const matches = buildMatches(input.settings);
  const title =
    input.title?.trim() ||
    `${input.settings.teams.map((t) => t.name).join(" · ")} · Phantom`;

  return {
    id: uid("phantom"),
    code: shareCode(),
    status: "live",
    settings: input.settings,
    matches,
    events: [],
    active_match_id: matches[0]?.id ?? null,
    standings: emptyStandings(input.settings),
    created_at: new Date().toISOString(),
    concluded_at: null,
    title,
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
  }));
}

export function computeStandings(session: PhantomSession): PhantomStandingRow[] {
  const rows = new Map(emptyStandings(session.settings).map((r) => [r.team_id, { ...r }]));

  for (const m of session.matches) {
    if (m.status !== "completed") continue;
    const home = rows.get(m.home_team_id);
    const away = rows.get(m.away_team_id);
    if (!home || !away) continue;

    const hs =
      session.settings.scoring_mode === "penalties"
        ? (m.home_penalties ?? 0)
        : session.settings.scoring_mode === "sets"
          ? m.home_sets
          : m.home_score;
    const as =
      session.settings.scoring_mode === "penalties"
        ? (m.away_penalties ?? 0)
        : session.settings.scoring_mode === "sets"
          ? m.away_sets
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
      home.points += 3;
    } else if (as > hs) {
      away.won++;
      home.lost++;
      away.points += 3;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(rows.values()).sort(
    (a, b) =>
      b.points - a.points ||
      b.goals_for - b.goals_against - (a.goals_for - a.goals_against) ||
      b.goals_for - a.goals_for
  );
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

export function winSet(
  session: PhantomSession,
  matchId: string,
  teamId: string
): PhantomSession {
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

  const matches = session.matches.map((m) => {
    if (m.id !== matchId) return m;
    const home_sets = m.home_team_id === teamId ? m.home_sets + 1 : m.home_sets;
    const away_sets = m.away_team_id === teamId ? m.away_sets + 1 : m.away_sets;
    return {
      ...m,
      home_sets,
      away_sets,
      home_score: home_sets,
      away_score: away_sets,
      current_period: m.current_period + 1,
    };
  });

  let next: PhantomSession = { ...session, matches };
  const updated = next.matches.find((m) => m.id === matchId)!;
  const need = Math.ceil(session.settings.best_of / 2);
  if (updated.home_sets >= need || updated.away_sets >= need) {
    next = completeMatch(next, matchId);
  }
  return next;
}

export function advancePeriod(session: PhantomSession, matchId: string): PhantomSession {
  const match = session.matches.find((m) => m.id === matchId);
  if (!match || match.status !== "live") return session;

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
