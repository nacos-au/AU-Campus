import type { Team } from "@/lib/types/database";
import { sportToDbId, type SportId } from "@/lib/utils/sport";

/**
 * Guest teams — external opponents (e.g. a visiting university).
 * Demo overlay mirrors production `teams.is_guest` + soft-delete.
 */
let guestTeams: Team[] = [];

export function listGuestTeams(sportId?: string): Team[] {
  const active = guestTeams.filter((t) => !t.deleted_at);
  if (!sportId) return active;
  return active.filter((t) => t.sport_id === sportId);
}

export interface CreateGuestTeamInput {
  name: string;
  sport: SportId;
  institution?: string | null;
  logo_url?: string | null;
}

export function addGuestTeam(input: CreateGuestTeamInput): Team {
  const team: Team = {
    id: `guest-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    department_id: null,
    sport_id: sportToDbId(input.sport),
    name: input.name,
    logo_url: input.logo_url ?? null,
    is_guest: true,
    institution: input.institution ?? null,
    deleted_at: null,
  };
  guestTeams = [...guestTeams, team];
  return team;
}

/** Soft-delete — matches that already reference the guest keep the team row. */
export function removeGuestTeam(id: string): void {
  guestTeams = guestTeams.map((t) =>
    t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t
  );
}

export function getGuestTeamById(id: string): Team | null {
  return guestTeams.find((t) => t.id === id) ?? null;
}

export function updateGuestTeamLogo(id: string, logoUrl: string): Team | null {
  const idx = guestTeams.findIndex((t) => t.id === id && !t.deleted_at);
  if (idx < 0) return null;
  const next = { ...guestTeams[idx], logo_url: logoUrl };
  guestTeams = [...guestTeams.slice(0, idx), next, ...guestTeams.slice(idx + 1)];
  return next;
}
