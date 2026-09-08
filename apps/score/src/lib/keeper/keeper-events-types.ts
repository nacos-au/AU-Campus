import type { SportId } from "@/lib/utils/sport";

export type KeeperEventStatus = "scheduled" | "live" | "completed" | "cancelled";

export interface KeeperEvent {
  id: string;
  sport_slug: SportId | string;
  title: string;
  scheduled_at: string;
  venue_id: string | null;
  venue_name?: string | null;
  tournament_id: string | null;
  match_id: string | null;
  status: KeeperEventStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  /** Assigned keeper user ids (when loaded with assignments) */
  assignee_ids?: string[];
  assignee_names?: string[];
}

export interface KeeperEventAssignment {
  id: string;
  user_id: string;
  keeper_event_id: string;
  assigned_at: string;
  assigned_by: string | null;
  display_name?: string | null;
  email?: string | null;
}

/** True when scheduled_at falls on the same local calendar day as `now`. */
export function isKeeperEventUnlocked(
  scheduledAt: string,
  now: Date = new Date()
): boolean {
  const d = new Date(scheduledAt);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
