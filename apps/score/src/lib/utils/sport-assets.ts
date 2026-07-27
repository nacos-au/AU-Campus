import type { SportId } from "@/lib/utils/sport";
import { dbIdToSport } from "@/lib/utils/sport";

export const SPORT_LOGOS: Record<SportId, string> = {
  football: "/logos/football.png",
  basketball: "/logos/basketball.png",
  volleyball: "/logos/volleyball.png",
  tennis: "/logos/tennis.svg",
  track: "/logos/track.svg",
};

/** Rotating demo player headshots */
export const PLAYER_AVATARS = [
  "/images/player-sample.png",
  "/images/player-1.png",
  "/images/player-2.png",
  "/images/player-3.png",
] as const;

export const PLAYER_AVATAR = PLAYER_AVATARS[0];

export function playerAvatarForIndex(index: number): string {
  return PLAYER_AVATARS[((index % PLAYER_AVATARS.length) + PLAYER_AVATARS.length) % PLAYER_AVATARS.length];
}

/** Resolve avatar from a player id like "pl-7" or athlete row id */
export function playerAvatarForId(id: string): string {
  const match = id.match(/(\d+)$/);
  const n = match ? parseInt(match[1], 10) - 1 : 0;
  return playerAvatarForIndex(n);
}

export function logoForSportId(sportId: string): string {
  return SPORT_LOGOS[dbIdToSport(sportId)];
}

export function logoForSport(sport: SportId): string {
  return SPORT_LOGOS[sport];
}
