import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { DEMO_PLAYERS } from "@/lib/data/demo";

export interface LineupPlayerEvents {
  goals: number;
  assists: number;
  substitutedOn: boolean;
  substitutedOff: boolean;
  yellowCard: boolean;
  redCard: boolean;
  isMotm: boolean;
}

function playerIdFromName(name: string): string | null {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const last = parts.slice(1).join(" ");
  const found = DEMO_PLAYERS.find(
    (p) => p.last_name === last || `${p.first_name[0]}. ${p.last_name}` === name
  );
  if (found) return found.id;
  return DEMO_PLAYERS.find((p) => p.last_name === last)?.id ?? null;
}

export function buildLineupPlayerEvents(
  events: DemoMatchEvent[],
  playerId: string,
  motmPlayerId: string | null,
  matchStarted: boolean
): LineupPlayerEvents {
  if (!matchStarted) {
    return {
      goals: 0,
      assists: 0,
      substitutedOn: false,
      substitutedOff: false,
      yellowCard: false,
      redCard: false,
      isMotm: false,
    };
  }

  let goals = 0;
  let assists = 0;
  let substitutedOn = false;
  let substitutedOff = false;
  let yellowCard = false;
  let redCard = false;

  for (const event of events) {
    if (event.event_type === "goal" || event.event_type === "penalty_scored") {
      if (event.player.id === playerId) goals += 1;
      const assistId =
        event.details?.assist_player_id != null
          ? String(event.details.assist_player_id)
          : event.details?.assist_player_name != null
            ? playerIdFromName(String(event.details.assist_player_name))
            : null;
      if (assistId === playerId) assists += 1;
    }

    if (event.event_type === "substitution") {
      if (event.player.id === playerId) substitutedOn = true;
      const outId =
        event.details?.player_out_id != null
          ? String(event.details.player_out_id)
          : event.details?.player_out_name != null
            ? playerIdFromName(String(event.details.player_out_name))
            : null;
      if (outId === playerId) substitutedOff = true;
    }

    if (event.event_type === "yellow_card" && event.player.id === playerId) {
      yellowCard = true;
    }
    if (event.event_type === "red_card" && event.player.id === playerId) {
      redCard = true;
    }
  }

  return {
    goals,
    assists,
    substitutedOn,
    substitutedOff,
    yellowCard,
    redCard,
    isMotm: motmPlayerId === playerId,
  };
}
