"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { TeamCrest } from "@/components/ui/team-crest";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import type { Team } from "@/lib/types/database";

export function AdminGuestTeamManager() {
  const [sport, setSport] = useState<SportId>("football");
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh(forSport: SportId) {
    const res = await fetch(`/api/guest-teams?sport=${forSport}`);
    const json = (await res.json()) as { teams?: Team[] };
    setTeams(json.teams ?? []);
  }

  useEffect(() => {
    refresh(sport);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  async function handleAdd() {
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/guest-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sport, institution }),
    });
    setName("");
    setInstitution("");
    setSaving(false);
    refresh(sport);
  }

  async function handleRemove(id: string) {
    await fetch(`/api/guest-teams?id=${id}`, { method: "DELETE" });
    refresh(sport);
  }

  return (
    <div className="table-card p-6">
      <h2 className="font-display text-lg font-extrabold">Guest Teams</h2>
      <p className="mt-1 text-sm opacity-70">
        Register a one-off opponent from outside AU — e.g. a visiting university — so it&apos;s
        ready to pick when scheduling or posting a result for a friendly.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[repeat(3,1fr)_auto]">
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={sport}
            onChange={(e) => setSport(e.target.value as SportId)}
          >
            {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Team name</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Unilag Marines"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Institution</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. University of Lagos"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || saving}
            className="btn-primary w-full rounded-lg px-4 py-2 font-display text-sm font-bold disabled:opacity-40 sm:w-auto"
          >
            Add team
          </button>
        </div>
      </div>

      {teams.length > 0 ? (
        <ul className="mt-5 divide-y divide-rule border-t border-rule">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <TeamCrest code="GST" logoUrl={t.logo_url} alt={t.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-bold">{t.name}</p>
                {t.institution && <p className="truncate text-xs opacity-60">{t.institution}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(t.id)}
                aria-label={`Remove ${t.name}`}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-center text-sm opacity-60">No guest teams for {SPORT_LABELS[sport]} yet.</p>
      )}
    </div>
  );
}
