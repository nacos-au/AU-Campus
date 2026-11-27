"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingLineupSubmission } from "@/lib/data/lineup-links";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminLineupReview({ items }: { items: PendingLineupSubmission[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(id: string, action: "approve" | "reject") {
    setError("");
    let note: string | null = null;
    if (action === "reject") {
      note = window.prompt("Reason for rejecting this XI (shown to staff only)", "") ?? null;
      if (note === null) return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/lineup-submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not review this XI.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not review this XI.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold">Lineup approvals</h1>
        <p className="mt-1 text-sm opacity-70">
          Starting XIs sent by team reps through their private link. Nothing goes live on a match
          until you approve it. You can also enter or edit any XI from the match page.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <div className="table-card p-6 text-center text-sm text-accent/70">
          No XIs waiting for approval.
        </div>
      ) : (
        items.map((item) => {
          const starters = item.players.filter((p) => p.is_starting);
          const bench = item.players.filter((p) => !p.is_starting);
          const captain = item.players.find((p) => p.is_captain);
          return (
            <article key={item.id} className="table-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-extrabold">
                    {item.team_name}
                    <span className="ml-2 text-sm font-semibold text-accent/60">{item.match_label}</span>
                  </p>
                  <p className="text-xs text-accent/60">
                    Kickoff {formatWhen(item.scheduled_at)} · Sent {formatWhen(item.submitted_at)}
                    {item.formation ? ` · ${item.formation}` : ""}
                    {item.coach_name ? ` · ${item.coach_name}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void review(item.id, "approve")}
                    className="btn-filled rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void review(item.id, "reject")}
                    className="rounded-full border border-red-300 px-4 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-accent/60">
                    Starting {starters.length}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {starters.map((p) => (
                      <li key={p.player_id}>
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}
                        {p.name}
                        {p.player_id === captain?.player_id ? " (C)" : ""}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-accent/60">
                    Bench {bench.length}
                  </p>
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {bench.map((p) => (
                      <li key={p.player_id}>
                        {p.jersey_number ? `#${p.jersey_number} ` : ""}
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
