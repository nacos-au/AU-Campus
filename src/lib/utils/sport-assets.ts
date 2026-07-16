import type { SportId } from "@/lib/utils/sport";
import { dbIdToSport } from "@/lib/utils/sport";

export const SPORT_LOGOS: Record<SportId, string> = {
  football: "/logos/football.png",
  basketball: "/logos/basketball.png",
  volleyball: "/logos/volleyball.png",
  tennis: "/logos/basketball.png",
  track: "/images/player-sample.png",
};

export const PLAYER_AVATAR = "/images/player-sample.png";

export function logoForSportId(sportId: string): string {
  return SPORT_LOGOS[dbIdToSport(sportId)];
}

export function logoForSport(sport: SportId): string {
  return SPORT_LOGOS[sport];
}
