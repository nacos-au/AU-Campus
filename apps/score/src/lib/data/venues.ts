import type { Venue } from "@/lib/types/database";

/** Seed presets — mirrored in the Supabase migration for production. */
const SEED_VENUES: Venue[] = [
  {
    id: "venue-main-field",
    name: "Achievers Main Field",
    location: "Main campus",
    sport_slug: "football",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-joked-field",
    name: "Joked Field",
    location: "Campus grounds",
    sport_slug: "football",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-bball-a",
    name: "Basketball Court A",
    location: "Indoor courts",
    sport_slug: "basketball",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-bball-b",
    name: "Basketball Court B",
    location: "Indoor courts",
    sport_slug: "basketball",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-tennis-a",
    name: "Tennis Court A",
    location: "Tennis complex",
    sport_slug: "tennis",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-tennis-b",
    name: "Tennis Court B",
    location: "Tennis complex",
    sport_slug: "tennis",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-track",
    name: "Achievers Main Field Track",
    location: "Athletics",
    sport_slug: "track",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-vb-a",
    name: "Volleyball Court A",
    location: "Indoor courts",
    sport_slug: "volleyball",
    is_active: true,
    deleted_at: null,
  },
  {
    id: "venue-vb-b",
    name: "Volleyball Court B",
    location: "Indoor courts",
    sport_slug: "volleyball",
    is_active: true,
    deleted_at: null,
  },
];

let overlay: Venue[] = [...SEED_VENUES];

export function listDemoVenues(opts?: {
  includeDeleted?: boolean;
  sportSlug?: string | null;
}): Venue[] {
  const includeDeleted = opts?.includeDeleted ?? false;
  return overlay
    .filter((v) => includeDeleted || !v.deleted_at)
    .filter((v) => !opts?.sportSlug || v.sport_slug === opts.sportSlug)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDemoVenueById(id: string): Venue | null {
  return overlay.find((v) => v.id === id) ?? null;
}

export function createDemoVenue(input: {
  name: string;
  location?: string;
  sport_slug?: string | null;
}): Venue {
  const venue: Venue = {
    id: `venue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: input.name.trim(),
    location: (input.location ?? "Achievers University, Owo").trim(),
    sport_slug: input.sport_slug ?? null,
    is_active: true,
    deleted_at: null,
  };
  overlay = [...overlay, venue];
  return venue;
}

export function updateDemoVenue(
  id: string,
  patch: {
    name?: string;
    location?: string;
    is_active?: boolean;
    sport_slug?: string | null;
  }
): Venue | null {
  const idx = overlay.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  const current = overlay[idx]!;
  const next = { ...current, ...patch };
  overlay = [...overlay.slice(0, idx), next, ...overlay.slice(idx + 1)];
  return next;
}

export function softDeleteDemoVenue(id: string): boolean {
  const idx = overlay.findIndex((v) => v.id === id);
  if (idx < 0) return false;
  const current = overlay[idx]!;
  overlay = [
    ...overlay.slice(0, idx),
    { ...current, deleted_at: new Date().toISOString(), is_active: false },
    ...overlay.slice(idx + 1),
  ];
  return true;
}
