"use client";

import { useCallback, useEffect, useState } from "react";
import type { Venue } from "@/lib/types/database";

/**
 * Admin-only venue presets. Soft-delete keeps historical match venue_ids resolvable.
 */
export function AdminVenueManager() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("Achievers University, Owo");
  const [sportSlug, setSportSlug] = useState("football");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/venues?includeDeleted=1");
    const json = (await res.json()) as { venues?: Venue[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? "Could not load venues");
      return;
    }
    setVenues(json.venues ?? []);
    setError("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    setError("");

    const res = await fetch("/api/venues", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editingId
          ? { id: editingId, name, location, sport_slug: sportSlug }
          : { name, location, sport_slug: sportSlug }
      ),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setError(json.error ?? "Save failed — check the name is unique and sport is set.");
      return;
    }

    setName("");
    setLocation("Achievers University, Owo");
    setSportSlug("football");
    setEditingId(null);
    await load();
  }

  async function handleSoftDelete(id: string) {
    if (!confirm("Admin action: soft-delete this venue?\n\nExisting matches keep the location, but it leaves the dropdown.")) return;
    setBusy(true);
    const res = await fetch(`/api/venues?id=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Delete failed");
      return;
    }
    await load();
  }

  function startEdit(venue: Venue) {
    setEditingId(venue.id);
    setName(venue.name);
    setLocation(venue.location);
    setSportSlug(venue.sport_slug ?? "football");
  }

  const active = venues.filter((v) => !v.deleted_at);
  const deleted = venues.filter((v) => v.deleted_at);

  return (
    <div className="table-card p-6">
      <h2 className="font-display text-lg font-extrabold">Match venues</h2>
      <p className="mt-1 text-sm opacity-70">
        Admin presets only. Soft-deleted venues stay on past matches but leave the dropdown.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-semibold">Name</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Basketball Court A"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Location</span>
          <input
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Sport</span>
          <select
            className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
            value={sportSlug}
            onChange={(e) => setSportSlug(e.target.value)}
          >
            <option value="football">Football</option>
            <option value="basketball">Basketball</option>
            <option value="tennis">Tennis</option>
            <option value="track">Track</option>
            <option value="volleyball">Volleyball</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={handleSave}
          className="btn-primary rounded-lg px-4 py-2 font-display text-sm font-bold disabled:opacity-40"
        >
          {editingId ? "Update venue" : "Add venue"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName("");
              setLocation("Achievers University, Owo");
              setSportSlug("football");
            }}
            className="rounded-lg border border-rule px-4 py-2 font-display text-sm font-bold"
          >
            Cancel
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <ul className="mt-5 divide-y divide-rule">
        {active.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{v.name}</p>
              <p className="truncate text-xs opacity-60">
                {v.sport_slug ?? "—"} · {v.location}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => startEdit(v)}
                className="text-xs font-bold text-accent hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleSoftDelete(v.id)}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {deleted.length > 0 && (
        <div className="mt-4 border-t border-rule pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-50">
            Soft-deleted (still on past matches)
          </p>
          <ul className="mt-2 space-y-1 text-sm opacity-60">
            {deleted.map((v) => (
              <li key={v.id}>
                {v.name} — {v.location}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
