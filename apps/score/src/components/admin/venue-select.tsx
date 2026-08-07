"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@/lib/types/database";

export function VenueSelect({
  value,
  onChange,
  label = "Venue",
  required = false,
  sportSlug,
}: {
  value: string;
  onChange: (venueId: string) => void;
  label?: string;
  required?: boolean;
  /** When set, only venues for this sport appear */
  sportSlug?: string | null;
}) {
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    const qs = sportSlug ? `?sport=${encodeURIComponent(sportSlug)}` : "";
    fetch(`/api/venues${qs}`)
      .then((r) => r.json())
      .then((json: { venues?: Venue[] }) => setVenues(json.venues ?? []))
      .catch(() => setVenues([]));
  }, [sportSlug]);

  useEffect(() => {
    if (value && venues.length > 0 && !venues.some((v) => v.id === value)) {
      onChange("");
    }
  }, [venues, value, onChange]);

  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">
          {sportSlug ? `Select ${sportSlug} venue` : "Select venue"}
        </option>
        {venues
          .filter((v) => v.is_active)
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
      </select>
      {sportSlug && venues.filter((v) => v.is_active).length === 0 && (
        <span className="mt-1 block text-xs font-semibold text-accent">
          No venues for this sport yet — add them in Admin → Venues.
        </span>
      )}
    </label>
  );
}
