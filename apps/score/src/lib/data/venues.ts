import type { Venue } from "@/lib/types/database";

/** Seed presets — mirrored in the Supabase migration for production. */
const SEED_VENUES: Venue[] = [
  {
    id: "venue-joked-field",
    name: "Joked Field",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-main-field",
    name: "Main Field",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-main-court",
    name: "Main Court",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-indoor-hall",
    name: "Indoor Hall",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-tennis-courts",
    name: "Tennis Courts",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-main-track",
    name: "Main Track",
    location: "Achievers University, Owo",
    is_active: true,
    deleted_at: null,
  },
];

/** In-memory overlay for demo / local session mutations. */
let overlay: Venue[] = [...SEED_VENUES];

export function listDemoVenues(opts?: { includeDeleted?: boolean }): Venue[] {
  const includeDeleted = opts?.includeDeleted ?? false;
  return overlay
    .filter((v) => includeDeleted || !v.deleted_at)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoVenueById(id: string): Venue | null {
  return overlay.find((v) => v.id === id) ?? null;
}

export function createDemoVenue(input: { name: string; location?: string }): Venue {
  const venue: Venue = {
    id: `venue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: input.name.trim(),
    location: (input.location ?? "Achievers University, Owo").trim(),
    is_active: true,
    deleted_at: null,
  };
  overlay = [...overlay, venue];
  return venue;
}

export function updateDemoVenue(
  id: string,
  patch: { name?: string; location?: string; is_active?: boolean }
): Venue | null {
  const idx = overlay.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  const current = overlay[idx]!;
  const next: Venue = {
    ...current,
    name: patch.name?.trim() ?? current.name,
    location: patch.location?.trim() ?? current.location,
    is_active: patch.is_active ?? current.is_active,
  };
  overlay = overlay.map((v, i) => (i === idx ? next : v));
  return next;
}

/** Soft-delete — historical matches keep the venue_id and can still resolve the name. */
export function softDeleteDemoVenue(id: string): Venue | null {
  const idx = overlay.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  const next: Venue = {
    ...overlay[idx]!,
    is_active: false,
    deleted_at: new Date().toISOString(),
  };
  overlay = overlay.map((v, i) => (i === idx ? next : v));
  return next;
}

export function resolveVenueForMatch(venueId: string | null | undefined): Venue | null {
  if (!venueId) return null;
  return getDemoVenueById(venueId);
}
