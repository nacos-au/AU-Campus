import type { Match } from "@/lib/types/database";
import { DEMO_DEPARTMENTS, DEMO_PLAYERS } from "@/lib/data/demo";
import { getSquadForTeam, getTennisLineupForMatch, type SquadPlayer } from "@/lib/data/demo-squads";
import { getSubmittedLineup, resolveLineupPlayers } from "@/lib/data/demo-lineups";
import { getTrackResultsForMatch } from "@/lib/data/demo-match-details";
import type { SportId } from "@/lib/utils/sport";
import { getKeeperSportConfig } from "@/lib/keeper/keeper-sport-config";

export function getKeeperRosters(
  match: Match,
  sport: SportId
): { home: SquadPlayer[]; away: SquadPlayer[]; singleLabel?: string } {
  const config = getKeeperSportConfig(sport);

  if (config.layout === "single") {
    const athletes = getTrackAthletes(match.id);
    return {
      home: athletes,
      away: [],
      singleLabel: match.home_team?.name ?? "Athletes",
    };
  }

  if (sport === "tennis") {
    const variant = match.match_variant === "doubles" ? "doubles" : "singles";
    return {
      home: getTennisLineupForMatch(match.home_team_id ?? "", variant),
      away: getTennisLineupForMatch(match.away_team_id ?? "", variant),
    };
  }

  return {
    home: rosterForSide(match, match.home_team_id ?? ""),
    away: rosterForSide(match, match.away_team_id ?? ""),
  };
}

/**
 * The club-submitted lineup is the source of truth for the keeper; if the
 * club never submitted one, fall back to the full squad roster.
 */
function rosterForSide(match: Match, teamId: string): SquadPlayer[] {
  const submitted = teamId ? getSubmittedLineup(match.id, teamId) : null;
  if (submitted) {
    return resolveLineupPlayers(submitted).map((p) => ({
      ...p,
      squad_role: p.is_starting ? "Starting" : "Substitute",
      jersey_number: undefined,
    }));
  }
  return getSquadForTeam(teamId, match.sport_id);
}

/** Track logs use the athlete's faculty — not the event name */
export function getAthleteTeamMeta(playerId: string) {
  const player = DEMO_PLAYERS.find((p) => p.id === playerId);
  const dept = DEMO_DEPARTMENTS.find((d) => d.id === player?.department_id);
  return {
    team_id: dept?.id ?? "unknown",
    team_name: dept?.name ?? "Unknown",
    team_code: dept?.short_code ?? "AU",
    team_logo_url: null,
  };
}

function getTrackAthletes(matchId: string): SquadPlayer[] {
  const results = getTrackResultsForMatch(matchId);
  if (results.length > 0) {
    const players: SquadPlayer[] = [];
    for (const r of results) {
      const player = DEMO_PLAYERS.find((p) => p.id === r.player_id);
      if (!player) continue;
      players.push({
        ...player,
        jersey_number: r.lane,
        squad_role: player.position ?? "Sprinter",
      });
    }
    return players;
  }

  return DEMO_PLAYERS.filter((p) => ["pl-11", "pl-12", "pl-1", "pl-4"].includes(p.id)).map((p) => ({
    ...p,
    squad_role: p.position ?? "Sprinter",
    jersey_number: undefined,
  }));
}
