"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminRosterImport } from "@/components/admin/admin-roster-import";
import { ImageUploadField, SportKeeperTabs } from "@/components/admin/image-upload-field";
import { SPORTS } from "@/components/layout/branded-section";
import type { RosterImportResult } from "@/lib/data/demo-roster";
import type { RosterPlayerRow } from "@/lib/data/demo-roster";
import { MATRIC_EXAMPLE, MATRIC_HINT, isMatricNumber, normaliseMatric } from "@/lib/roster/matric";
import {
  formatPositions,
  formatPositionsDisplay,
  SPORT_POSITION_DEFS,
} from "@/lib/roster/positions";
import { ROSTER_UPDATED_EVENT } from "@/lib/roster/parse-roster";
import type { Team } from "@/lib/types/database";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

export function AdminPlayersPanel() {
  const [sport, setSport] = useState<SportId>("football");
  const [clubId, setClubId] = useState<string>("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<RosterPlayerRow[]>([]);
  const [view, setView] = useState<"squad" | "import">("squad");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formClubId, setFormClubId] = useState("");
  const [positions, setPositions] = useState<string[]>([]);
  const [jersey, setJersey] = useState("");
  const [matric, setMatric] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const positionOptions = SPORT_POSITION_DEFS[sport];

  const visiblePlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.matric_number ?? "").toLowerCase().includes(q) ||
        (p.team_name ?? "").toLowerCase().includes(q)
    );
  }, [players, search]);

  const load = useCallback(async (forSport: SportId, teamId: string) => {
    try {
      const q = new URLSearchParams({ sport: forSport, players: "1" });
      if (teamId !== "all") q.set("teamId", teamId);
      const res = await fetch(`/api/roster?${q}`);
      const json = (await res.json()) as {
        teams?: Team[];
        players?: RosterPlayerRow[];
        error?: string;
      };
      if (!res.ok) {
        setTeams([]);
        setPlayers([]);
        return;
      }
      setTeams(json.teams ?? []);
      setPlayers(json.players ?? []);
    } catch {
      setTeams([]);
      setPlayers([]);
    }
  }, []);

  useEffect(() => {
    void load(sport, clubId);
  }, [sport, clubId, load]);

  useEffect(() => {
    function onRoster() {
      void load(sport, clubId);
    }
    window.addEventListener(ROSTER_UPDATED_EVENT, onRoster);
    return () => window.removeEventListener(ROSTER_UPDATED_EVENT, onRoster);
  }, [sport, clubId, load]);

  const departmentTeams = useMemo(() => teams.filter((t) => !t.is_guest), [teams]);

  useEffect(() => {
    if (!formClubId && departmentTeams[0]) {
      setFormClubId(departmentTeams[0].id);
    }
  }, [departmentTeams, formClubId]);

  function resetForm() {
    setEditingId(null);
    setFirstName("");
    setLastName("");
    setPositions([]);
    setJersey("");
    setMatric("");
  }

  async function handleSavePlayer() {
    setError("");
    setMessage("");
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError("First and last name are required.");
      return;
    }
    if (!formClubId) {
      setError("Pick a club.");
      return;
    }
    const matricNorm = normaliseMatric(matric);
    if (matric.trim() && !isMatricNumber(matric.trim())) {
      setError(`Matric should look like ${MATRIC_EXAMPLE}.`);
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const res = await fetch("/api/roster", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "player_fields",
            id: editingId,
            first_name: first,
            last_name: last,
            team_id: formClubId,
            position: formatPositions(positions),
            jersey_number: jersey.trim() ? Number(jersey) : null,
            matric_number: matricNorm || null,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Could not update player");
          return;
        }
        setMessage(`${first} ${last} updated.`);
        resetForm();
        window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
        await load(sport, clubId);
        return;
      }

      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          players: [
            {
              first_name: first,
              last_name: last,
              team_id: formClubId,
              position: formatPositions(positions),
              jersey_number: jersey.trim() ? Number(jersey) : null,
              matric_number: matricNorm,
            },
          ],
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        result?: RosterImportResult;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not add player");
        return;
      }
      const result = json.result;
      if (result?.errors?.length) {
        setError(result.errors.join(" · "));
      }
      if (!result?.registrations) {
        setError((prev) => prev || "Player saved but not linked to the club squad — try again.");
        await load(sport, clubId);
        return;
      }
      resetForm();
      setMessage(`${first} ${last} registered.`);
      setClubId(formClubId);
      window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
      await load(sport, formClubId);
    } catch {
      setError(editingId ? "Could not update player" : "Could not add player");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Players</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Register athletes to a club for {SPORT_LABELS[sport]} — the club pool is unlimited.
          Squad size caps are set when you create a competition, then fill that competition&apos;s
          teams. Add basics first, then attach photos.
        </p>
      </div>

      <SportKeeperTabs
        sports={SPORTS.map((s) => ({ id: s.id, label: s.label }))}
        active={sport}
        onChange={(id) => {
          setSport(id as SportId);
          setClubId("all");
          setFormClubId("");
          setPositions([]);
        }}
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "squad" as const, label: `Squad (${players.length})` },
            { id: "import" as const, label: "Paste list" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={cn(
              "rounded-full px-4 py-2 font-display text-sm font-bold",
              view === t.id ? "btn-filled" : "border border-rule bg-white text-accent/70"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "import" ? (
        <AdminRosterImport
          fixedMode="players"
          fixedSport={sport}
          hideSport
          title="Paste player list"
          description={`Bulk-register athletes. Matric format ${MATRIC_EXAMPLE}. Positions use SofaScore codes (GK, CB, ST, PG…) — join several with / or + (e.g. CAM/LW).`}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm">
              <span className="font-semibold">Search players / clubs</span>
              <input
                className={inputClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, matric, or club…"
              />
            </label>
            <label className="block max-w-xs text-sm">
              <span className="font-semibold">Filter by club</span>
              <select
                className={inputClass}
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
              >
                <option value="all">All clubs</option>
                {departmentTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="table-card overflow-hidden">
              <ul className="divide-y divide-rule">
                {visiblePlayers.length === 0 ? (
                  <li className="px-5 py-10 text-center text-sm text-accent/60">
                    No players registered for this filter yet.
                  </li>
                ) : (
                  visiblePlayers.map((p) => {
                    const initials = `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase();
                    const role =
                      formatPositionsDisplay(p.position) ||
                      formatPositionsDisplay(p.squad_role) ||
                      p.squad_role;
                    return (
                      <li key={`${p.id}-${p.team_id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-sm font-bold">
                            {p.first_name} {p.last_name}
                            {p.jersey_number != null && (
                              <span className="ml-2 font-mono text-xs text-accent/50">#{p.jersey_number}</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-accent/60">
                            {p.team_name}
                            {role ? ` · ${role}` : ""}
                            {p.matric_number ? ` · ${p.matric_number}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full border border-rule px-3 py-1 text-xs font-bold text-accent/70"
                          onClick={() => {
                            setEditingId(p.id);
                            setFirstName(p.first_name);
                            setLastName(p.last_name);
                            setFormClubId(p.team_id);
                            setJersey(p.jersey_number != null ? String(p.jersey_number) : "");
                            setMatric(p.matric_number ?? "");
                            setPositions(
                              (p.position ?? "")
                                .split(/[+/|,]/)
                                .map((s) => s.trim())
                                .filter(Boolean)
                            );
                          }}
                        >
                          Edit
                        </button>
                        <ImageUploadField
                          compact
                          currentUrl={p.avatar_url}
                          fallbackCode={initials}
                          uploadKind="player_avatar"
                          entityId={p.id}
                          onUploaded={() => void load(sport, clubId)}
                        />
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            <div className="table-card h-fit space-y-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-extrabold">
                  {editingId ? "Edit player" : "Add player"}
                </h3>
                {editingId && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-accent/60 underline"
                    onClick={() => resetForm()}
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-semibold">First</span>
                  <input
                    className={inputClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ada"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-semibold">Last</span>
                  <input
                    className={inputClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Okafor"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="font-semibold">Club</span>
                <select
                  className={inputClass}
                  value={formClubId}
                  onChange={(e) => setFormClubId(e.target.value)}
                >
                  {departmentTeams.length === 0 && <option value="">No clubs yet</option>}
                  {departmentTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="space-y-2">
                <label className="block text-sm">
                  <span className="font-semibold">Position</span>
                  <span className="mt-0.5 block text-xs text-accent/55">
                    SofaScore codes for {SPORT_LABELS[sport]}. Add more than one if needed.
                  </span>
                  <select
                    className={cn(inputClass, "font-mono")}
                    value=""
                    onChange={(e) => {
                      const abbr = e.target.value;
                      if (!abbr) return;
                      setPositions((prev) => (prev.includes(abbr) ? prev : [...prev, abbr]));
                    }}
                  >
                    <option value="">Select position…</option>
                    {positionOptions.map((p) => (
                      <option key={p.abbr} value={p.abbr} disabled={positions.includes(p.abbr)}>
                        {p.abbr} — {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                {positions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {positions.map((abbr) => {
                      const def = positionOptions.find((p) => p.abbr === abbr);
                      return (
                        <button
                          key={abbr}
                          type="button"
                          title={def ? `${def.abbr} — ${def.name}` : abbr}
                          onClick={() => setPositions((prev) => prev.filter((p) => p !== abbr))}
                          className="inline-flex items-center gap-1 rounded-full btn-filled px-2.5 py-1 font-mono text-[11px] font-bold"
                        >
                          {abbr}
                          <span aria-hidden className="opacity-70">
                            ×
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="block text-sm">
                <span className="font-semibold">Jersey</span>
                <input
                  className={inputClass}
                  value={jersey}
                  onChange={(e) => setJersey(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="9"
                  inputMode="numeric"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Matric</span>
                <input
                  className={inputClass}
                  value={matric}
                  onChange={(e) => setMatric(e.target.value.toUpperCase())}
                  placeholder={MATRIC_EXAMPLE}
                />
                <span className="mt-1 block text-xs text-accent/50">{MATRIC_HINT}</span>
              </label>
              <button
                type="button"
                disabled={busy || !firstName.trim() || !lastName.trim() || !formClubId}
                onClick={() => void handleSavePlayer()}
                className="btn-filled w-full rounded-full px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
              >
                {busy ? "Saving…" : editingId ? "Save changes" : "Add player"}
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-accent/80">{message}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
