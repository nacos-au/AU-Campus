import type { IconType } from "react-icons";
import {
  GiBasketballBall,
  GiRunningShoe,
  GiSoccerBall,
  GiTennisRacket,
  GiVolleyballBall,
} from "react-icons/gi";
import type { SportId } from "@/lib/utils/sport";
import { dbIdToSport } from "@/lib/utils/sport";

/** Game Icons (react-icons/gi) — detailed sports illustrations, CC BY 3.0 */
export const SPORT_ICON_MAP: Record<SportId, IconType> = {
  football: GiSoccerBall,
  basketball: GiBasketballBall,
  tennis: GiTennisRacket,
  volleyball: GiVolleyballBall,
  track: GiRunningShoe,
};

export const SPORT_ICON_SIZES = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 36,
} as const;

export type SportIconSize = keyof typeof SPORT_ICON_SIZES;

export function getSportIcon(sport: SportId): IconType {
  return SPORT_ICON_MAP[sport];
}

export function getSportIconByDbId(sportDbId: string): IconType {
  return SPORT_ICON_MAP[dbIdToSport(sportDbId)];
}
