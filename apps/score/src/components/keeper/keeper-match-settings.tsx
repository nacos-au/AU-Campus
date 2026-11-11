"use client";

import { useState } from "react";
import { Settings, X } from "lucide-react";
import type { Match } from "@/lib/types/database";

export function KeeperMatchSettings({
  match,
  onMatchPatched,
  clockElapsedSeconds = 0,
  onJumpClock,
}: {
  match: Match;
  onMatchPatched?: (patch: Partial<Match>) => void;
  /** Current elapsed seconds for the jump-clock control. */
  clockElapsedSeconds?: number;
  /** Late-start / manual jump — sets absolute elapsed seconds. */
  onJumpClock?: (elapsedSeconds: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [referee, setReferee] = useState(match.referee_name ?? "");
  const [ar1, setAr1] = useState(match.assistant_referee_1 ?? "");
  const [ar2, setAr2] = useState(match.assistant_referee_2 ?? "");
  const [postponeReason, setPostponeReason] = useState(match.postpone_reason ?? "");
  const [jumpMinutes, setJumpMinutes] = useState(Math.floor(clockElapsedSeconds / 60));
  const [jumpSeconds, setJumpSeconds] = useState(clockElapsedSeconds % 60);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function applyJump() {
    if (!onJumpClock) return;
    const m = Math.max(0, Math.floor(Number(jumpMinutes) || 0));
    const s = Math.min(59, Math.max(0, Math.floor(Number(jumpSeconds) || 0)));
    onJumpClock(m * 60 + s);
    setMessage(`Clock set to ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.`);
  }

  async function saveOfficials() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referee_name: referee.trim() || null,
          assistant_referee_1: ar1.trim() || null,
          assistant_referee_2: ar2.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not save officials");
        return;
      }
      onMatchPatched?.({
        referee_name: referee.trim() || null,
        assistant_referee_1: ar1.trim() || null,
        assistant_referee_2: ar2.trim() || null,
      });
      setMessage("Officials saved.");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function postponeMatch() {
    const reason = postponeReason.trim();
    if (!reason) {
      setError("Add a postpone reason first.");
      return;
    }
    if (!confirm(`Postpone this match?\n\n${reason}`)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/matches/${match.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "postponed", postpone_reason: reason }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not postpone");
        return;
      }
      onMatchPatched?.({ status: "postponed", postpone_reason: reason });
      setMessage("Match postponed.");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function restoreScheduled() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/matches/${match.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not restore");
        return;
      }
      onMatchPatched?.({ status: "scheduled", postpone_reason: null });
      setPostponeReason("");
      setMessage("Match restored to scheduled.");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule text-accent/70 transition hover:bg-surface hover:text-accent"
        aria-label="Match settings"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-lg font-extrabold">Match settings</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-accent/60 hover:bg-surface"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {onJumpClock && (
              <div className="mb-6 space-y-3 border-b border-rule pb-5">
                <p className="text-xs font-bold uppercase tracking-wide text-accent/50">
                  Jump clock (late start)
                </p>
                <p className="text-xs text-accent/60">
                  Last-resort: set the match clock to an absolute MM:SS so keepers can catch up after
                  a delayed kick-off.
                </p>
                <div className="flex items-end gap-2">
                  <label className="block flex-1 text-sm">
                    <span className="font-semibold">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      className="mt-1 w-full rounded-lg border border-rule px-3 py-2 font-mono"
                      value={jumpMinutes}
                      onChange={(e) => setJumpMinutes(Number(e.target.value))}
                    />
                  </label>
                  <span className="pb-2 font-display text-xl font-bold">:</span>
                  <label className="block flex-1 text-sm">
                    <span className="font-semibold">Seconds</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      className="mt-1 w-full rounded-lg border border-rule px-3 py-2 font-mono"
                      value={jumpSeconds}
                      onChange={(e) => setJumpSeconds(Number(e.target.value))}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={applyJump}
                  className="w-full rounded-lg border border-rule px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  Set clock
                </button>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-accent/50">Officials</p>
              <label className="block text-sm">
                <span className="font-semibold">Referee</span>
                <input
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={referee}
                  onChange={(e) => setReferee(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Assistant referee 1</span>
                <input
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={ar1}
                  onChange={(e) => setAr1(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">Assistant referee 2</span>
                <input
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  value={ar2}
                  onChange={(e) => setAr2(e.target.value)}
                  placeholder="Optional"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveOfficials()}
                className="btn-filled w-full rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-40"
              >
                Save officials
              </button>
            </div>

            <div className="mt-6 space-y-3 border-t border-rule pt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-accent/50">Postpone</p>
              <label className="block text-sm">
                <span className="font-semibold">Reason</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
                  rows={3}
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  placeholder="Weather, pitch conditions, …"
                />
              </label>
              {match.status === "postponed" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void restoreScheduled()}
                  className="w-full rounded-lg border border-rule px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  Restore to scheduled
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || match.status === "live" || match.status === "completed"}
                  onClick={() => void postponeMatch()}
                  className="w-full rounded-lg border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800 disabled:opacity-40"
                >
                  Postpone match
                </button>
              )}
            </div>

            {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
