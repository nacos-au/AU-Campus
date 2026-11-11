import type { Match } from "@/lib/types/database";
import { getDemoVenueById } from "@/lib/data/venues";
import { playerAvatarForId } from "@/lib/utils/sport-assets";

const FALLBACK_VENUES = ["Joked Field", "Main Field"] as const;

export interface MatchMeta {
  venue: string;
  location: string;
  referee: string | null;
  assistantReferee1: string | null;
  assistantReferee2: string | null;
}

export function getMatchMeta(match: Match): MatchMeta {
  const joined = match.venue ?? (match.venue_id ? getDemoVenueById(match.venue_id) : null);
  const officials = {
    referee: match.referee_name?.trim() || null,
    assistantReferee1: match.assistant_referee_1?.trim() || null,
    assistantReferee2: match.assistant_referee_2?.trim() || null,
  };

  if (joined) {
    return {
      venue: joined.name,
      location: joined.location,
      ...officials,
    };
  }

  const idx = match.id.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return {
    venue: FALLBACK_VENUES[idx % FALLBACK_VENUES.length],
    location: "Achievers University, Owo",
    ...officials,
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
