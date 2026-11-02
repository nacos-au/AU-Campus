"use client";

import { useCallback, useState } from "react";
import { AdminCompetitionSquadsPanel } from "@/components/admin/admin-competition-squads-panel";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";

export default function AdminCompetitionsPage() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const onCreated = useCallback((id: string) => setFocusId(id), []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Competitions</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Publish leagues and cups from the clubs in each sport, then fill each club&apos;s
          competition squad (roster caps live here). Keepers pick up fixtures from the published
          calendar.
        </p>
      </div>
      <AdminCompetitionWizard onCreated={onCreated} />
      <AdminCompetitionSquadsPanel focusCompetitionId={focusId} />
      <AdminKeeperCalendar />
    </div>
  );
}
