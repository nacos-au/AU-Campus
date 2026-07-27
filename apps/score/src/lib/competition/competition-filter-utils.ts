import type { Tournament } from "@/lib/types/database";

export interface CompetitionOption {
  id: string;
  name: string;
  season: string;
}

export function toCompetitionOptions(tournaments: Tournament[]): CompetitionOption[] {
  return tournaments.map((t) => ({ id: t.id, name: t.name, season: t.season }));
}
