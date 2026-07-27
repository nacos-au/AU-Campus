import type { Match } from "@/lib/types/database";
import { playerAvatarForId } from "@/lib/utils/sport-assets";

const VENUES = ["Joked Field", "Main Field"] as const;

export interface MatchMeta {
  venue: string;
  location: string;
  referee: string;
}

export function getMatchMeta(match: Match): MatchMeta {
  const idx = match.id.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return {
    venue: VENUES[idx % VENUES.length],
    location: "Achievers University, Owo",
    referee: "Emmanuel Adebayo",
  };
}

export interface ManOfTheMatch {
  player_id: string;
  first_name: string;
  last_name: string;
  team_name: string;
  team_logo_url: string | null;
  avatar_url: string | null;
  rating: number;
}

const MOTM_BY_MATCH: Record<string, ManOfTheMatch> = {
  "match-3": {
    player_id: "pl-1",
    first_name: "Adaeze",
    last_name: "Okonkwo",
    team_name: "CSC FC",
    team_logo_url: "/logos/football-csc.png",
    avatar_url: playerAvatarForId("pl-1"),
    rating: 8.4,
  },
  "match-6": {
    player_id: "pl-1",
    first_name: "Adaeze",
    last_name: "Okonkwo",
    team_name: "CSC Hoops",
    team_logo_url: null,
    avatar_url: playerAvatarForId("pl-1"),
    rating: 8.2,
  },
  "match-15": {
    player_id: "pl-1",
    first_name: "Adaeze",
    last_name: "Okonkwo",
    team_name: "CSC FC",
    team_logo_url: "/logos/football-csc.png",
    avatar_url: playerAvatarForId("pl-1"),
    rating: 8.7,
  },
};

export function getManOfTheMatch(matchId: string): ManOfTheMatch | null {
  return MOTM_BY_MATCH[matchId] ?? null;
}
