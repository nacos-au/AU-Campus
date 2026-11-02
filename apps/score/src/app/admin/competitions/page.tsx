"use client";

import { useCallback, useState } from "react";
import { AdminCompetitionSchedulePanel } from "@/components/admin/admin-competition-schedule-panel";
import { AdminCompetitionSquadsPanel } from "@/components/admin/admin-competition-squads-panel";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminCustomCompetition } from "@/components/admin/admin-custom-competition";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";

export default function AdminCompetitionsPage() {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const onCreated = useCallback((id: string) => setFocusId(id), []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Competitions</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Custom comps: set fixture count → fill empty boxes with clubs, dates, and venues →
          publish. Then fill squads. Keepers pick up the fixtures.
        </p>
      </div>

      <AdminCustomCompetition onCreated={onCreated} />
      <AdminVenueManager />
      <AdminCompetitionSquadsPanel focusCompetitionId={focusId} />
      <p className="text-sm text-accent/60">
        After fixtures exist, open a match from Keeper or Matches to submit the starting XI from
        each competition squad. Live scoring (periods, ET/pens, subs) runs in the keeper console.
      </p>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="font-display text-sm font-bold text-accent/70 underline-offset-2 hover:underline"
        >
          {showAdvanced ? "Hide" : "Show"} league / cup builder &amp; add-on fixtures
        </button>
        {showAdvanced && (
          <div className="mt-4 space-y-8">
            <AdminCompetitionWizard onCreated={onCreated} />
            <AdminCompetitionSchedulePanel focusCompetitionId={focusId} />
            <AdminKeeperCalendar />
          </div>
        )}
      </div>
    </div>
  );
}
