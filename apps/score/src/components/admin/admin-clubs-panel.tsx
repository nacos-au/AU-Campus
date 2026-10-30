"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminRosterImport } from "@/components/admin/admin-roster-import";
import { ImageUploadField, SportKeeperTabs } from "@/components/admin/image-upload-field";
import { TeamCrest } from "@/components/ui/team-crest";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ROSTER_UPDATED_EVENT } from "@/lib/roster/parse-roster";
import { SPORTS } from "@/components/layout/branded-section";
import type { Department, Team } from "@/lib/types/database";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

export function AdminClubsPanel() {
  const { confirm } = useConfirm();
  const [sport, setSport] = useState<SportId>("football");
  const [teams, setTeams] = useState<Team[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tab, setTab] = useState<"au" | "guest" | "import">("au");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // AU club form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [deptName, setDeptName] = useState("");

  // Guest form
  const [guestName, setGuestName] = useState("");
  const [institution, setInstitution] = useState("");

  const load = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/roster?sport=${forSport}`);
      const json = (await res.json()) as { teams?: Team[]; departments?: Department[] };
      setTeams(json.teams ?? []);
      setDepartments(json.departments ?? []);
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    void load(sport);
  }, [sport, load]);

  useEffect(() => {
    function onRoster() {
      void load(sport);
    }
    window.addEventListener(ROSTER_UPDATED_EVENT, onRoster);
    return () => window.removeEventListener(ROSTER_UPDATED_EVENT, onRoster);
  }, [sport, load]);

  const auTeams = useMemo(() => teams.filter((t) => !t.is_guest), [teams]);
  const guestTeams = useMemo(() => teams.filter((t) => t.is_guest), [teams]);

  function codeFromName(n: string) {
    return n
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 6);
  }

  async function handleAddClub() {
    setError("");
    setMessage("");
    const clubName = name.trim();
    const deptCode = (code.trim() || codeFromName(clubName)).toUpperCase();
    if (!clubName || !deptCode) {
      setError("Name and department code are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          teams: [
            {
              name: clubName,
              department_code: deptCode,
              department_name: deptName.trim() || clubName,
            },
          ],
        }),
      });
      const json = (await res.json()) as { error?: string; result?: { teams_created: number; teams_existing: number } };
      if (!res.ok) {
        setError(json.error ?? "Could not add club");
        return;
      }
      setName("");
      setCode("");
      setDeptName("");
      setMessage(
        json.result?.teams_created
          ? `${clubName} added.`
          : `${clubName} was already on the books.`
      );
      window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
      await load(sport);
    } catch {
      setError("Could not add club");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddGuest() {
    setError("");
    setMessage("");
    if (!guestName.trim()) {
      setError("Guest team name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/guest-teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName, sport, institution }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not add guest");
        return;
      }
      setGuestName("");
      setInstitution("");
      setMessage("Guest team added.");
      window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
      await load(sport);
    } catch {
      setError("Could not add guest");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveGuest(id: string, label: string) {
    const ok = await confirm({
      eyebrow: "Guest teams",
      title: `Remove ${label}?`,
      body: "Existing friendlies that already reference this side keep the name.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await fetch(`/api/guest-teams?id=${id}`, { method: "DELETE" });
    window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
    await load(sport);
  }

  const list = tab === "au" ? auTeams : guestTeams;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Clubs</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Register AU sides and guest opponents for {SPORT_LABELS[sport]}. Attach logos after create.
        </p>
      </div>

      <SportKeeperTabs
        sports={SPORTS.map((s) => ({ id: s.id, label: s.label }))}
        active={sport}
        onChange={(id) => setSport(id as SportId)}
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "au" as const, label: `AU clubs (${auTeams.length})` },
            { id: "guest" as const, label: `Guests (${guestTeams.length})` },
            { id: "import" as const, label: "Paste list" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 font-display text-sm font-bold",
              tab === t.id ? "btn-filled" : "border border-rule bg-white text-accent/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "import" ? (
        <AdminRosterImport
          fixedMode="teams"
          fixedSport={sport}
          hideSport
          title="Paste club list"
          description="Bulk-create AU clubs from a spreadsheet or chat paste. Logos are attached afterwards from the AU clubs tab."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="table-card overflow-hidden">
            <ul className="divide-y divide-rule">
              {list.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-accent/60">
                  No {tab === "au" ? "AU clubs" : "guest teams"} for {SPORT_LABELS[sport]} yet.
                </li>
              ) : (
                list.map((t) => {
                  const dept = departments.find((d) => d.id === t.department_id);
                  const codeLabel = dept?.short_code ?? (t.is_guest ? "GST" : "?");
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                      <TeamCrest code={codeLabel} logoUrl={t.logo_url} alt={t.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold">{t.name}</p>
                        <p className="truncate text-xs text-accent/60">
                          {t.is_guest
                            ? t.institution || "Guest opponent"
                            : dept
                              ? `${dept.short_code} · ${dept.name}`
                              : "AU club"}
                        </p>
                      </div>
                      <ImageUploadField
                        compact
                        currentUrl={t.logo_url}
                        fallbackCode={codeLabel.slice(0, 3)}
                        uploadKind="team_logo"
                        entityId={t.id}
                        onUploaded={() => void load(sport)}
                      />
                      {t.is_guest && (
                        <button
                          type="button"
                          onClick={() => void handleRemoveGuest(t.id, t.name)}
                          aria-label={`Remove ${t.name}`}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="table-card h-fit space-y-4 p-5">
            {tab === "au" ? (
              <>
                <h3 className="font-display text-lg font-extrabold">Add AU club</h3>
                <label className="block text-sm">
                  <span className="font-semibold">Club name</span>
                  <input
                    className={inputClass}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!code) setCode(codeFromName(e.target.value));
                    }}
                    placeholder="e.g. Computer Science FC"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Department code</span>
                  <input
                    className={inputClass}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CSC"
                    maxLength={8}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Department name</span>
                  <input
                    className={inputClass}
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="Optional full department title"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !name.trim()}
                  onClick={() => void handleAddClub()}
                  className="btn-filled w-full rounded-full px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Add club"}
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-extrabold">Add guest</h3>
                <label className="block text-sm">
                  <span className="font-semibold">Team name</span>
                  <input
                    className={inputClass}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Unilag Marines"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Institution</span>
                  <input
                    className={inputClass}
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g. University of Lagos"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !guestName.trim()}
                  onClick={() => void handleAddGuest()}
                  className="btn-filled w-full rounded-full px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Add guest"}
                </button>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-accent/80">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
