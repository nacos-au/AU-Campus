"use client";

import { useCallback, useState } from "react";
import { AdminCompetitionSchedulePanel } from "@/components/admin/admin-competition-schedule-panel";
import { AdminCompetitionSquadsPanel } from "@/components/admin/admin-competition-squads-panel";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminCustomCompetition } from "@/components/admin/admin-custom-competition";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";

export function AdminCompetitionsDesk({ isAdmin }: { isAdmin: boolean }) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const onCreated = useCallback((id: string) => setFocusId(id), []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {isAdmin ? "Competitions" : "Competition squads"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          {isAdmin
            ? "Custom comps: set fixture count → fill empty boxes with clubs, dates, and venues → publish. Then fill squads. Keepers pick up the fixtures."
            : "Nominate players from each club pool onto the competition squad (up to the squad cap). Predicted XI / 5 subs are set per match from this list."}
        </p>
      </div>

      {isAdmin && (
        <>
          <AdminCustomCompetition onCreated={onCreated} />
          <AdminVenueManager />
        </>
      )}
      <AdminCompetitionSquadsPanel focusCompetitionId={focusId} />
      <p className="text-sm text-accent/60">
        After fixtures exist, open a match from Keeper or Matches to submit the starting XI (and
        bench) from each competition squad. Live scoring runs in the keeper console.
      </p>

      {isAdmin && (
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
      )}
    </div>
  );
}
