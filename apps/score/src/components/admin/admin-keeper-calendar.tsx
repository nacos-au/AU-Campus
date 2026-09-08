"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeeperEvent } from "@/lib/keeper/keeper-events-types";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";

const SPORTS: SportId[] = ["football", "basketball", "volleyball", "tennis", "track"];

type KeeperCandidate = { id: string; display_name: string; email: string | null };

/**
 * Admin calendar: create season/track events and assign record keepers.
 */
export function AdminKeeperCalendar() {
  const [events, setEvents] = useState<KeeperEvent[]>([]);
  const [keepers, setKeepers] = useState<KeeperCandidate[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [sport, setSport] = useState<SportId>("football");
  const [scheduledAt, setScheduledAt] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");
  const [assignEventId, setAssignEventId] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const load = useCallback(async () => {
    const [evRes, kRes] = await Promise.all([
      fetch("/api/keeper-events"),
      fetch("/api/keeper-events/candidates"),
    ]);
    const evJson = (await evRes.json()) as { events?: KeeperEvent[]; error?: string };
    const kJson = (await kRes.json()) as { keepers?: KeeperCandidate[]; error?: string };
    if (!evRes.ok) {
      setError(evJson.error ?? "Could not load calendar events.");
      return;
    }
    setEvents(evJson.events ?? []);
    setKeepers(kJson.keepers ?? []);
    setError("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Event title is empty — enter a name (e.g. Matchweek 3 or 100m Finals).");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/keeper-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        sport_slug: sport,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || null,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create event.");
      return;
    }
    setTitle("");
    setNotes("");
    await load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this event from the calendar?")) return;
    setBusy(true);
    const res = await fetch(`/api/keeper-events?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Delete failed.");
      return;
    }
    await load();
  }

  async function handleAssign() {
    if (!assignEventId || !assignUserId) {
      setError("Select an event and a record keeper to assign.");
      return;
    }
    const keeper = keepers.find((k) => k.id === assignUserId);
    setBusy(true);
    setError("");
    const res = await fetch(`/api/keeper-events/${assignEventId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: assignUserId,
        display_name: keeper?.display_name,
        email: keeper?.email,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? "Assignment failed.");
      return;
    }
    setAssignUserId("");
    await load();
  }

  async function handleUnassign(eventId: string, userId: string) {
    setBusy(true);
    const res = await fetch(
      `/api/keeper-events/${eventId}/assignments?user_id=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Could not remove assignment.");
      return;
    }
    await load();
  }

  return (
    <div className="table-card space-y-6 p-6">
      <div>
        <h2 className="font-display text-lg font-extrabold">Keeper calendar</h2>
        <p className="mt-1 text-sm opacity-70">
          Build the season or meet schedule, then assign record keepers. Keepers only see
          events assigned to them — unlocked on the event day.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold">Event title</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Matchweek 4 — CSC vs MEC, or 200m Heats"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={sport}
            onChange={(e) => setSport(e.target.value as SportId)}
          >
            {SPORTS.map((s) => (
              <option key={s} value={s}>
                {SPORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Date & time</span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-semibold">Notes (optional)</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void handleCreate()}
        className="btn-primary rounded-lg px-4 py-2 font-display text-sm font-bold text-white disabled:opacity-40"
      >
        Add to calendar
      </button>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="border-t border-rule pt-4">
        <h3 className="font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
          Assign keeper
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-rule px-3 py-2 text-sm"
            value={assignEventId ?? ""}
            onChange={(e) => setAssignEventId(e.target.value || null)}
          >
            <option value="">Select event</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-rule px-3 py-2 text-sm"
            value={assignUserId}
            onChange={(e) => setAssignUserId(e.target.value)}
          >
            <option value="">Select keeper</option>
            {keepers.map((k) => (
              <option key={k.id} value={k.id}>
                {k.display_name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleAssign()}
            className="btn-filled rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Assign
          </button>
        </div>
        {keepers.length === 0 && (
          <p className="mt-2 text-xs font-semibold text-accent">
            No Score record keepers found — grant the role in Campus Office first.
          </p>
        )}
      </div>

      <ul className="divide-y divide-rule">
        {events.length === 0 && (
          <li className="py-4 text-sm opacity-60">No calendar events yet.</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">{e.title}</p>
              <p className="text-xs opacity-60">
                {SPORT_LABELS[e.sport_slug as SportId] ?? e.sport_slug} ·{" "}
                {new Date(e.scheduled_at).toLocaleString()}
              </p>
              {(e.assignee_ids?.length ?? 0) > 0 ? (
                <ul className="mt-1 space-y-0.5 text-xs font-semibold text-accent/80">
                  {(e.assignee_ids ?? []).map((uid, i) => (
                    <li key={uid}>
                      {(e.assignee_names?.[i] ?? uid)}{" "}
                      <button
                        type="button"
                        className="text-red-600 underline"
                        onClick={() => void handleUnassign(e.id, uid)}
                      >
                        remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs opacity-50">No keepers assigned</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleDelete(e.id)}
              className="shrink-0 text-xs font-bold text-red-600 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
