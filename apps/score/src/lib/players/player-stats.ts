/**
 * Pure career-stat summary for one player (no server imports, unit tested).
 * Rules match the public leaderboards: shootout kicks never count, assists skip
 * pending/solo goals, own goals are not goals.
 */

export interface PlayerStatEvent {
  match_id: string;
  event_type: string;
  period?: string | null;
  player_id: string | null;
  details?: Record<string, unknown> | null;
}

export interface PlayerStatLineup {
  match_id: string;
  players: Array<{ player_id: string; is_starting?: boolean }> | null;
}

export interface PlayerCareerStats {
  appearances: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

/** Event types that prove the player was on the pitch. */
const ON_PITCH_EVENTS = new Set([
  "goal",
  "penalty_scored",
  "penalty_missed",
  "own_goal",
  "substitution",
]);

export function summarizePlayerStats(input: {
  playerId: string;
  events: PlayerStatEvent[];
  lineups: PlayerStatLineup[];
}): PlayerCareerStats {
  const { playerId, events, lineups } = input;
  const played = new Set<string>();
  let goals = 0;
  let assists = 0;
  let yellow = 0;
  let red = 0;

  for (const lineup of lineups) {
    const entry = lineup.players?.find((p) => p.player_id === playerId);
    if (entry?.is_starting) played.add(lineup.match_id);
  }

  for (const e of events) {
    if (e.period === "penalty_shootout") continue;
    const d = e.details ?? {};

    if (e.event_type === "substitution" && d.player_in_id === playerId) {
      played.add(e.match_id);
      continue;
    }

    const isGoal = e.event_type === "goal" || e.event_type === "penalty_scored";
    if (
      isGoal &&
      typeof d.assist_player_id === "string" &&
      d.assist_player_id === playerId &&
      d.assist_pending !== true &&
      d.solo_goal !== true
    ) {
      assists += 1;
      played.add(e.match_id);
    }

    if (e.player_id !== playerId) continue;

    if (isGoal) goals += 1;
    if (e.event_type === "yellow_card") yellow += 1;
    if (e.event_type === "red_card") red += 1;
    if (ON_PITCH_EVENTS.has(e.event_type)) played.add(e.match_id);
  }

  return {
    appearances: played.size,
    goals,
    assists,
    yellow_cards: yellow,
    red_cards: red,
  };
}

export interface PlayerStatTile {
  label: string;
  value: number | string;
  note?: string;
}

/** Tiles shown on a football profile. */
export function footballStatTiles(stats: PlayerCareerStats): PlayerStatTile[] {
  const cards = stats.yellow_cards + stats.red_cards;
  return [
    { label: "Appearances", value: stats.appearances },
    { label: "Goals", value: stats.goals },
    { label: "Assists", value: stats.assists },
    {
      label: "Cards",
      value: cards,
      note: cards > 0 ? `${stats.yellow_cards} yellow · ${stats.red_cards} red` : undefined,
    },
  ];
}
