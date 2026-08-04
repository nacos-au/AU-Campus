"use client";

import { useEffect, useState } from "react";
import type { Venue } from "@/lib/types/database";

export function VenueSelect({
  value,
  onChange,
  label = "Venue",
  required = false,
}: {
  value: string;
  onChange: (venueId: string) => void;
  label?: string;
  required?: boolean;
}) {
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    fetch("/api/venues")
      .then((r) => r.json())
      .then((json: { venues?: Venue[] }) => setVenues(json.venues ?? []))
      .catch(() => setVenues([]));
  }, []);

  return (
    <label className="block text-sm">
      <span className="font-semibold">{label}</span>
      <select
        className="mt-1 w-full rounded-lg border border-rule px-3 py-2"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select venue</option>
        {venues
          .filter((v) => v.is_active)
          .map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
      </select>
    </label>
  );
}
