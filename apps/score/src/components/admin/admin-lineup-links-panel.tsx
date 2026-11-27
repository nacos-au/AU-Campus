"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import type { CompetitionLinkOverview } from "@/lib/data/lineup-links";
import { describeCutoff } from "@/lib/lineup-links/cutoff";

const inputClass = "rounded-lg border border-rule px-2 py-1 text-sm";

type IssuedToken = { team_name: string; url: string };

export function AdminLineupLinksPanel({ competitionId }: { competitionId: string }) {
  const [overview, setOverview] = useState<CompetitionLinkOverview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultDraft, setDefaultDraft] = useState("60");
  const [bulkCutoff, setBulkCutoff] = useState("");
  const [issued, setIssued] = useState<IssuedToken[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!competitionId) return;
    try {
      const res = await fetch(`/api/competitions/${competitionId}/lineup-links`);
      const json = (await res.json()) as CompetitionLinkOverview & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load submission links");
        return;
      }
      setOverview(json);
      setDefaultDraft(String(json.competition_cutoff_minutes));
    } catch {
      setError("Could not load submission links");
    }
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  function origin(): string {
    return typeof window !== "undefined" ? window.location.origin : "";
  }

  async function call(body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/lineup-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return null;
      }
      await load();
      return json;
    } catch {
      setError("Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createFor(teamId: string, teamName: string) {
    const json = await call({ action: "create", team_id: teamId });
    if (json && typeof json.token === "string") {
      setIssued([{ team_name: teamName, url: `${origin()}/lineup/submit/${json.token}` }]);
      setMessage(`New link for ${teamName}. The old one stopped working.`);
    }
  }

  async function generateForSelected() {
    const ids = [...selected];
    const json = await call({
      action: "generate_missing",
      team_ids: ids.length ? ids : undefined,
      cutoff_minutes: bulkCutoff.trim() === "" ? null : Number(bulkCutoff),
    });
    if (json && Array.isArray(json.created)) {
      const created = json.created as Array<{ team_name: string; token: string }>;
      setIssued(created.map((c) => ({ team_name: c.team_name, url: `${origin()}/lineup/submit/${c.token}` })));
      setMessage(
        created.length
          ? `Created ${created.length} link${created.length === 1 ? "" : "s"}. Copy them now, they are shown once.`
          : "Every selected side already has a link. Use Regenerate to issue a new one."
      );
    }
  }

  async function revoke(linkId: string, teamName: string) {
    if (!window.confirm(`Revoke the link for ${teamName}? The rep will no longer be able to submit.`)) return;
    await call({ action: "revoke", link_id: linkId });
    setMessage(`Revoked the link for ${teamName}.`);
  }

  async function setCutoffFor(ids: string[], minutes: number | null) {
    await call({ action: "set_cutoff", link_ids: ids, cutoff_minutes: minutes });
    setMessage(
      minutes === null
        ? "Cut-off reset to the competition default."
        : `Cut-off set to ${describeCutoff(minutes)}.`
    );
  }

  async function saveDefault() {
    const minutes = Number(defaultDraft);
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
      setError("Enter a whole number of minutes between 0 and 1440.");
      return;
    }
    const json = await call({ action: "set_default", cutoff_minutes: minutes });
    if (json) setMessage(`Competition default is now ${describeCutoff(minutes)}.`);
  }

  function toggle(teamId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  const withLinks = overview?.teams.filter((t) => t.link) ?? [];

  return (
    <div className="table-card mt-6 p-6">
      <h3 className="flex items-center gap-2 font-display text-base font-extrabold">
        <Link2 className="h-4 w-4 text-accent" />
        Team XI links
      </h3>
      <p className="mt-1 text-sm opacity-70">
        Each side gets a private link. Reps use it to send the starting XI, with no account.
        Sent XIs wait for your approval. The cut-off is when submissions close before kickoff.
      </p>

      {overview && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-accent/5 px-3 py-3 text-sm">
          <label className="block">
            <span className="font-semibold">Competition default cut-off (minutes before kickoff)</span>
            <span className="mt-1 flex gap-2">
              <input
                className={`${inputClass} w-24`}
                inputMode="numeric"
                value={defaultDraft}
                onChange={(e) => setDefaultDraft(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveDefault()}
                className="btn-filled rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50"
              >
                Save default
              </button>
            </span>
          </label>
          <p className="text-xs text-accent/70">
            Currently {describeCutoff(overview.competition_cutoff_minutes)}. Links without their own
            cut-off follow this.
          </p>
        </div>
      )}

      {overview && (
        <div className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <label className="block">
            <span className="font-semibold">Bulk cut-off for selected clubs</span>
            <span className="mt-1 flex gap-2">
              <input
                className={`${inputClass} w-24`}
                inputMode="numeric"
                placeholder="default"
                value={bulkCutoff}
                onChange={(e) => setBulkCutoff(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !bulkCutoff.trim()}
                onClick={() => void setCutoffFor([...selected].flatMap((id) => overview.teams.filter((t) => t.team_id === id && t.link).map((t) => t.link!.id)), Number(bulkCutoff))}
                className="rounded-full border border-rule px-3 py-1 text-xs font-bold text-accent/80 disabled:opacity-40"
              >
                Apply to selected
              </button>
            </span>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void setCutoffFor(withLinks.map((t) => t.link!.id), null)}
            className="rounded-full border border-rule px-3 py-1 text-xs font-bold text-accent/80 disabled:opacity-40"
          >
            Reset all links to default
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void generateForSelected()}
            className="btn-filled rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50"
          >
            {selected.size ? `Generate for ${selected.size} selected` : "Generate for all clubs without a link"}
          </button>
        </div>
      )}

      {overview && (
        <ul className="mt-4 divide-y divide-rule rounded-lg border border-rule">
          {overview.teams.map((t) => (
            <li key={t.team_id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
              <input
                type="checkbox"
                aria-label={`Select ${t.team_name}`}
                checked={selected.has(t.team_id)}
                onChange={() => toggle(t.team_id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{t.team_name}</p>
                <p className="text-xs text-accent/60">
                  {t.link
                    ? `Link active · ${t.link.use_count} submission${t.link.use_count === 1 ? "" : "s"}${t.link.last_used_at ? ` · last used ${new Date(t.link.last_used_at).toLocaleDateString("en-NG")}` : ""}`
                    : "No link yet"}
                </p>
              </div>
              {t.link && (
                <span className="text-xs text-accent/70">
                  Closes {t.link.effective_cutoff_minutes} min before kickoff
                  {t.link.cutoff_minutes === null ? " (default)" : ""}
                </span>
              )}
              {t.link && (
                <input
                  aria-label={`Cut-off for ${t.team_name} in minutes`}
                  className={`${inputClass} w-20`}
                  inputMode="numeric"
                  placeholder={String(t.link.effective_cutoff_minutes)}
                  defaultValue={t.link.cutoff_minutes ?? ""}
                  onBlur={(e) => {
                    const raw = e.target.value.trim();
                    const next = raw === "" ? null : Number(raw);
                    if (next === t.link!.cutoff_minutes) return;
                    if (next !== null && (!Number.isInteger(next) || next < 0 || next > 1440)) {
                      setError("Cut-off must be a whole number of minutes between 0 and 1440.");
                      return;
                    }
                    void setCutoffFor([t.link!.id], next);
                  }}
                />
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void createFor(t.team_id, t.team_name)}
                className="rounded-full border border-rule px-3 py-1 text-xs font-bold text-accent/80 disabled:opacity-40"
              >
                {t.link ? "Regenerate" : "Create link"}
              </button>
              {t.link && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void revoke(t.link!.id, t.team_name)}
                  className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-700 disabled:opacity-40"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {issued.length > 0 && (
        <div className="mt-4 space-y-2 rounded-lg border border-accent/25 bg-accent/[0.04] p-3">
          <p className="text-xs font-bold text-accent">
            Copy these now. For security the link is shown once and cannot be read back later.
          </p>
          {issued.map((i) => (
            <div key={i.url} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">{i.team_name}</span>
              <code className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1">{i.url}</code>
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(i.url)}
                className="rounded-full border border-rule px-2 py-0.5 font-bold text-accent/80"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-3 text-sm text-accent/80">{message}</p>}
    </div>
  );
}
