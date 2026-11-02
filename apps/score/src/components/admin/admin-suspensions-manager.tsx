"use client";

import { useCallback, useEffect, useState } from "react";
import type { SuspensionRow } from "@/lib/data/suspensions";

/**
 * Active discipline list — clear a suspension once the ban is served.
 */
export function AdminSuspensionsManager() {
  const [rows, setRows] = useState<SuspensionRow[]>([]);
  const [includeCleared, setIncludeCleared] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/suspensions?activeOnly=${includeCleared ? "0" : "1"}`
      );
      const json = (await res.json()) as { suspensions?: SuspensionRow[]; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load suspensions");
        setRows([]);
        return;
      }
      setRows(json.suspensions ?? []);
    } catch {
      setError("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [includeCleared]);

  useEffect(() => {
    void load();
  }, [load]);

  async function clearOne(id: string) {
    if (!confirm("Mark this suspension as served / cleared?")) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/suspensions/${id}`, { method: "PATCH" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not clear suspension");
        return;
      }
      setMessage("Suspension cleared.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="table-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">Suspensions</h2>
          <p className="mt-1 text-sm opacity-70">
            Red cards and yellow accumulation create bans automatically. Clear them once served —
            cleared players can be named on match sheets again.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold">
          <input
            type="checkbox"
            checked={includeCleared}
            onChange={(e) => setIncludeCleared(e.target.checked)}
          />
          Show cleared
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-accent/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-accent/60">No suspensions{includeCleared ? "" : " active"}.</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">
                  {s.player_name}
                  {s.matric_number ? (
                    <span className="ml-2 font-mono text-xs font-semibold text-accent/60">
                      {s.matric_number}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-accent/70">
                  {s.reason.replace(/_/g, " ")} · from{" "}
                  {new Date(s.suspended_from).toLocaleDateString()}
                  {!s.is_active ? " · cleared" : ""}
                </p>
              </div>
              {s.is_active ? (
                <button
                  type="button"
                  disabled={busyId === s.id}
                  onClick={() => void clearOne(s.id)}
                  className="rounded-lg border border-rule px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  {busyId === s.id ? "…" : "Mark served"}
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-700">Served</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="mt-3 text-sm font-semibold text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
