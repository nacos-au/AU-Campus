"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardPaste, Users } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  parsePlayers,
  parseTeams,
  ROSTER_FORMAT_HINTS,
  ROSTER_UPDATED_EVENT,
  type ParsedPlayer,
  type ParsedTeam,
} from "@/lib/roster/parse-roster";
import type { RosterImportResult } from "@/lib/data/demo-roster";
import type { Team } from "@/lib/types/database";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

type Mode = "teams" | "players";
const INLINE_TEAM = "__inline__";

const inputClass = "mt-1 w-full rounded-lg border border-rule px-3 py-2 text-sm";

export function AdminRosterImport({
  fixedMode,
  fixedSport,
  hideSport,
  title,
  description,
}: {
  /** Lock to teams or players (hides mode toggle). */
  fixedMode?: Mode;
  fixedSport?: SportId;
  hideSport?: boolean;
  title?: string;
  description?: string;
} = {}) {
  const { confirm } = useConfirm();
  const [sport, setSport] = useState<SportId>(fixedSport ?? "football");
  const [mode, setMode] = useState<Mode>(fixedMode ?? "teams");
  const [text, setText] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [targetTeamId, setTargetTeamId] = useState<string>(INLINE_TEAM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RosterImportResult | null>(null);

  useEffect(() => {
    if (fixedSport) setSport(fixedSport);
  }, [fixedSport]);

  useEffect(() => {
    if (fixedMode) setMode(fixedMode);
  }, [fixedMode]);

  const loadTeams = useCallback(async (forSport: SportId) => {
    try {
      const res = await fetch(`/api/roster?sport=${forSport}`);
      const json = (await res.json()) as { teams?: Team[] };
      setTeams(json.teams ?? []);
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    void loadTeams(sport);
  }, [sport, loadTeams]);

  const departmentTeams = useMemo(() => teams.filter((t) => !t.is_guest), [teams]);

  const parsedTeams = useMemo(
    () => (mode === "teams" ? parseTeams(text) : null),
    [mode, text]
  );
  const parsedPlayers = useMemo(
    () =>
      mode === "players"
        ? parsePlayers(text, { knownTeams: departmentTeams.map((t) => t.name) })
        : null,
    [mode, text, departmentTeams]
  );

  const targetTeam = departmentTeams.find((t) => t.id === targetTeamId) ?? null;

  const readyTeams = (parsedTeams?.rows ?? []).filter((r) => r.name);
  const readyPlayers = (parsedPlayers?.rows ?? []).filter(
    (r) => r.first_name && (targetTeam || r.team_name)
  );
  const readyCount = mode === "teams" ? readyTeams.length : readyPlayers.length;
  const warningCount =
    mode === "teams"
      ? readyTeams.filter((r) => r.issues.length).length
      : readyPlayers.filter((r) => r.issues.length).length;

  async function handleImport() {
    setError("");
    setResult(null);

    const label =
      mode === "teams"
        ? `${readyTeams.length} team${readyTeams.length === 1 ? "" : "s"}`
        : `${readyPlayers.length} player${readyPlayers.length === 1 ? "" : "s"}`;

    const ok = await confirm({
      eyebrow: "Bulk import",
      title: `Import ${label} into ${SPORT_LABELS[sport]}?`,
      body:
        mode === "players" && targetTeam
          ? `They’ll be registered to ${targetTeam.name}. Existing players (matched by matric number or name) are reused, not duplicated.`
          : mode === "players"
            ? "Each line’s team column decides where the player goes. Existing players are reused, not duplicated."
            : "Departments are created from the codes as needed. Teams that already exist are skipped.",
      confirmLabel: "Import",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "teams"
            ? {
                sport,
                teams: readyTeams.map((t) => ({
                  name: t.name,
                  department_code: t.department_code ?? "",
                  department_name: t.department_name,
                })),
              }
            : {
                sport,
                players: readyPlayers.map((p) => ({
                  first_name: p.first_name,
                  last_name: p.last_name,
                  matric_number: p.matric_number,
                  position: p.position,
                  jersey_number: p.jersey_number,
                  team_id: targetTeam?.id ?? null,
                  team_name: targetTeam ? null : p.team_name,
                })),
              }
        ),
      });
      const json = (await res.json()) as { ok?: boolean; result?: RosterImportResult; error?: string };
      if (!res.ok || !json.result) {
        setError(json.error ?? "Import failed.");
        return;
      }
      setResult(json.result);
      setText("");
      window.dispatchEvent(new Event(ROSTER_UPDATED_EVENT));
      await loadTeams(sport);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="table-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Users className="h-5 w-5 text-accent" />
            {title ?? "Onboard Teams & Players"}
          </h2>
          <p className="mt-1 max-w-xl text-sm opacity-70">
            {description ??
              "Paste a list straight from a spreadsheet, WhatsApp or a note. One entry per line, or on one line separated by commas or semicolons."}
          </p>
        </div>

        {!fixedMode && (
          <div className="flex rounded-full border border-rule p-0.5">
            {(["teams", "players"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setResult(null);
                  setError("");
                }}
                className={cn(
                  "rounded-full px-4 py-1.5 font-display text-xs font-bold capitalize",
                  mode === m ? "btn-filled" : "text-accent/70"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* ── Input column ── */}
        <div className="space-y-4">
          <div className={cn("grid gap-3", mode === "players" && !hideSport && "sm:grid-cols-2")}>
            {!hideSport && (
              <label className="block text-sm">
                <span className="font-semibold">Sport</span>
                <select
                  className={inputClass}
                  value={sport}
                  onChange={(e) => {
                    setSport(e.target.value as SportId);
                    setTargetTeamId(INLINE_TEAM);
                    setResult(null);
                  }}
                >
                  {(Object.keys(SPORT_LABELS) as SportId[]).map((s) => (
                    <option key={s} value={s}>
                      {SPORT_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {mode === "players" && (
              <label className="block text-sm">
                <span className="font-semibold">Add to team</span>
                <select
                  className={inputClass}
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                >
                  <option value={INLINE_TEAM}>Team named on each line</option>
                  {departmentTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label className="block text-sm">
            <span className="flex items-center gap-1.5 font-semibold">
              <ClipboardPaste className="h-4 w-4 opacity-60" />
              {mode === "teams" ? "Teams list" : "Players list"}
            </span>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              rows={9}
              spellCheck={false}
              placeholder={ROSTER_FORMAT_HINTS[mode].join("\n")}
              className="mt-1 w-full resize-y rounded-xl border border-rule bg-wrapper px-3 py-2.5 font-mono text-[13px] leading-relaxed placeholder:opacity-40 focus:border-accent focus:outline-none"
            />
          </label>

          <div className="rounded-xl border border-accent/15 bg-accent/[0.04] px-4 py-3 text-xs leading-relaxed">
            <p className="font-display font-bold uppercase tracking-wide text-accent/60">Format</p>
            {mode === "teams" ? (
              <p className="mt-1">
                <strong>Team name</strong> then optionally a <strong>department code</strong> (CSC, MEC…) and the{" "}
                <strong>department name</strong>. “Law Barristers (LAW)” also works. If no code is given,
                it’s taken from the first word of the name.
              </p>
            ) : (
              <p className="mt-1">
                <strong>First Last</strong> then any of: <strong>matric</strong> (AU23AC5696),{" "}
                <strong>position</strong> SofaScore codes (GK, CB, ST, PG, OH…), <strong>jersey</strong>{" "}
                (9 or #9) and, when not importing into one team, the <strong>team name</strong>. Order
                doesn’t matter. Several positions: <code className="rounded bg-surface px-1">CAM/LW</code>{" "}
                or <code className="rounded bg-surface px-1">S + L</code>.
              </p>
            )}
          </div>
        </div>

        {/* ── Preview column ── */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-sm font-bold">
              Preview
              {readyCount > 0 && (
                <span className="ml-2 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-accent">
                  {readyCount} ready
                </span>
              )}
              {warningCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  {warningCount} to check
                </span>
              )}
            </p>
            {(parsedTeams?.delimiter || parsedPlayers?.delimiter) && (
              <p className="text-[11px] opacity-60">
                Split on {parsedTeams?.delimiter ?? parsedPlayers?.delimiter}
                {(parsedTeams?.skipped_header || parsedPlayers?.skipped_header) && " · header row skipped"}
              </p>
            )}
          </div>

          <div className="mt-2 overflow-hidden rounded-xl border border-rule">
            <div className="table-scroll-x max-h-[22rem] overflow-y-auto">
              {mode === "teams" ? (
                <TeamsPreview rows={parsedTeams?.rows ?? []} />
              ) : (
                <PlayersPreview rows={parsedPlayers?.rows ?? []} showTeam={!targetTeam} />
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={busy || readyCount === 0}
              className="btn-filled rounded-full px-5 py-2.5 font-display text-sm font-bold disabled:opacity-40"
            >
              {busy
                ? "Importing…"
                : readyCount === 0
                  ? `Import ${mode}`
                  : `Import ${readyCount} ${mode === "teams" ? "team" : "player"}${readyCount === 1 ? "" : "s"}`}
            </button>
            {mode === "players" && !targetTeam && readyCount === 0 && (parsedPlayers?.rows.length ?? 0) > 0 && (
              <span className="text-xs text-amber-800">
                Pick a team above, or add a team name to each line.
              </span>
            )}
            {error && (
              <span className="flex items-center gap-1 text-sm font-semibold text-red-700">
                <AlertCircle className="h-4 w-4" /> {error}
              </span>
            )}
          </div>

          {result && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="flex items-center gap-1.5 font-display font-bold">
                <CheckCircle2 className="h-4 w-4" /> Import complete
              </p>
              <ul className="mt-1.5 grid gap-x-6 gap-y-0.5 text-xs sm:grid-cols-2">
                {result.departments_created > 0 && <li>{result.departments_created} departments created</li>}
                <li>{result.teams_created} teams created · {result.teams_existing} already existed</li>
                <li>{result.players_created} players created · {result.players_existing} already existed</li>
                <li>{result.registrations} squad registrations</li>
              </ul>
              {result.errors.length > 0 && (
                <details className="mt-2 text-xs text-red-800">
                  <summary className="cursor-pointer font-semibold">
                    {result.errors.length} row{result.errors.length === 1 ? "" : "s"} skipped
                  </summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── previews ───────────────────────────── */

const th = "sticky top-0 bg-wrapper px-3 py-2 text-left font-display text-[11px] font-bold uppercase tracking-wide text-accent/60";
const td = "px-3 py-2 align-top";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm opacity-50">{children}</p>;
}

function IssueBadges({ issues }: { issues: string[] }) {
  if (!issues.length) return <span className="text-emerald-700">✓</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {issues.map((i) => (
        <span key={i} className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
          {i}
        </span>
      ))}
    </span>
  );
}

function TeamsPreview({ rows }: { rows: ParsedTeam[] }) {
  if (!rows.length) return <Empty>Parsed teams will appear here as you paste.</Empty>;
  return (
    <table className="w-full min-w-[28rem] text-sm">
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Team</th>
          <th className={th}>Code</th>
          <th className={th}>Department</th>
          <th className={th}>Check</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r) => (
          <tr key={r.line} className={cn(!r.name && "opacity-50")}>
            <td className={cn(td, "font-mono text-xs opacity-50")}>{r.line}</td>
            <td className={cn(td, "font-display font-bold")}>{r.name || "—"}</td>
            <td className={td}>
              {r.department_code ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-xs font-bold",
                    r.code_inferred ? "bg-amber-50 text-amber-900" : "bg-surface"
                  )}
                  title={r.code_inferred ? "Inferred from the team name" : undefined}
                >
                  {r.department_code}
                  {r.code_inferred && "?"}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td className={cn(td, "opacity-80")}>{r.department_name ?? "—"}</td>
            <td className={cn(td, "text-xs")}>
              <IssueBadges issues={r.issues} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlayersPreview({ rows, showTeam }: { rows: ParsedPlayer[]; showTeam: boolean }) {
  if (!rows.length) return <Empty>Parsed players will appear here as you paste.</Empty>;
  return (
    <table className="w-full min-w-[34rem] text-sm">
      <thead>
        <tr>
          <th className={th}>#</th>
          <th className={th}>Player</th>
          <th className={th}>Matric</th>
          <th className={th}>Position</th>
          <th className={th}>No.</th>
          {showTeam && <th className={th}>Team</th>}
          <th className={th}>Check</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-rule">
        {rows.map((r) => {
          const blocked = !r.first_name || (showTeam && !r.team_name);
          return (
            <tr key={r.line} className={cn(blocked && "opacity-50")}>
              <td className={cn(td, "font-mono text-xs opacity-50")}>{r.line}</td>
              <td className={cn(td, "font-display font-bold")}>
                {r.first_name} {r.last_name}
              </td>
              <td className={cn(td, "font-mono text-xs")}>{r.matric_number ?? "—"}</td>
              <td className={td}>{r.position ?? "—"}</td>
              <td className={cn(td, "font-mono text-xs")}>{r.jersey_number ?? "—"}</td>
              {showTeam && (
                <td className={cn(td, !r.team_name && "text-amber-800")}>{r.team_name ?? "no team"}</td>
              )}
              <td className={cn(td, "text-xs")}>
                <IssueBadges issues={r.issues} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
