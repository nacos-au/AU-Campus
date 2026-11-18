export const SPORT_IDS = [
  "football",
  "basketball",
  "tennis",
  "volleyball",
  "track",
] as const;

export type SportId = (typeof SPORT_IDS)[number];

const SPORT_DB_MAP: Record<SportId, string> = {
  football: "sport-football",
  basketball: "sport-basketball",
  tennis: "sport-tennis",
  track: "sport-track",
  volleyball: "sport-volleyball",
};

const VALID_SPORTS = new Set<SportId>(SPORT_IDS);

export function parseSportParam(sport?: string): SportId {
  if (sport && VALID_SPORTS.has(sport as SportId)) {
    return sport as SportId;
  }
  return "football";
}

export function sportToDbId(sport: SportId): string {
  return SPORT_DB_MAP[sport];
}

export function dbIdToSport(dbId: string): SportId {
  const entry = Object.entries(SPORT_DB_MAP).find(([, id]) => id === dbId);
  return (entry?.[0] as SportId) ?? "football";
}

export const SPORT_LABELS: Record<SportId, string> = {
  football: "Football",
  basketball: "Basketball",
  tennis: "Tennis",
  track: "Track & Field",
  volleyball: "Volleyball",
};

/** Public hub sports with real competitions/clubs. Flip when a sport goes live. */
export const ONBOARDED_PUBLIC_SPORTS: readonly SportId[] = ["football"];

export function isPublicSportOnboarded(sport: SportId): boolean {
  return ONBOARDED_PUBLIC_SPORTS.includes(sport);
}
