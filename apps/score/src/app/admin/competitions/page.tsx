"use client";

import { useCallback, useState } from "react";
import { AdminCompetitionSchedulePanel } from "@/components/admin/admin-competition-schedule-panel";
import { AdminCompetitionSquadsPanel } from "@/components/admin/admin-competition-squads-panel";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";

export default function AdminCompetitionsPage() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const onCreated = useCallback((id: string) => setFocusId(id), []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Competitions</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Create an event with the clubs you need, add campus venues, schedule the known
          fixtures, then fill each competition squad. Keepers pick up official fixtures from
          the calendar.
        </p>
      </div>
      <AdminCompetitionWizard onCreated={onCreated} />
      <AdminVenueManager />
      <AdminCompetitionSchedulePanel focusCompetitionId={focusId} />
      <AdminCompetitionSquadsPanel focusCompetitionId={focusId} />
      <AdminKeeperCalendar />
    </div>
  );
}
