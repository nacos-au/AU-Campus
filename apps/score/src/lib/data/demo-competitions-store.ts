import type { Tournament } from "@/lib/types/database";

/**
 * Demo overlay for competitions created on the spot from the admin wizard.
 * Fixtures are materialised into the demo match store so the public match
 * list and the keeper's "available fixtures" pick them up immediately.
 */
let created: Tournament[] = [];

export function listCreatedDemoTournaments(sportId?: string): Tournament[] {
  return sportId ? created.filter((t) => t.sport_id === sportId) : [...created];
}

export function getCreatedDemoTournament(id: string): Tournament | null {
  return created.find((t) => t.id === id) ?? null;
}

export function registerDemoTournament(t: Tournament): Tournament {
  created = [...created, t];
  return t;
}

/** Next Saturday at 16:00 local time, `weeks` weeks ahead. */
export function nextMatchday(weeks = 0, hourOffset = 0): string {
  const d = new Date();
  const day = d.getDay();
  const untilSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + untilSat + weeks * 7);
  d.setHours(16 + hourOffset, 0, 0, 0);
  return d.toISOString();
}
