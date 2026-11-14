import type { createClient } from "@/lib/supabase/server";
import { dbIdToSport, type SportId } from "@/lib/utils/sport";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Map a `sports.name` row to the public SportId slug used in URLs. */
export function sportLabelToSportId(name: string): SportId {
  const n = name.toLowerCase();
  if (n.includes("basket")) return "basketball";
  if (n.includes("volley")) return "volleyball";
  if (n.includes("tennis")) return "tennis";
  if (n.includes("track") || n.includes("athlet")) return "track";
  return "football";
}

/**
 * Resolve demo slugs (`sport-football`) or live UUIDs to the URL SportId.
 * Pass an optional id→name map for batch pages (hub / live).
 */
export function sportRefToSportId(
  sportRef: string,
  uuidToName?: Map<string, string>
): SportId {
  if (sportRef.startsWith("sport-")) return dbIdToSport(sportRef);
  if (
    sportRef === "football" ||
    sportRef === "basketball" ||
    sportRef === "tennis" ||
    sportRef === "volleyball" ||
    sportRef === "track"
  ) {
    return sportRef;
  }
  const name = uuidToName?.get(sportRef);
  return name ? sportLabelToSportId(name) : "football";
}

/** Load sports.id → name for Live UUID → SportId mapping. */
export async function fetchSportNameMap(
  supabase: Supabase
): Promise<Map<string, string>> {
  const { data } = (await supabase.from("sports").select("id, name")) as {
    data: Array<{ id: string; name: string }> | null;
  };
  return new Map((data ?? []).map((r) => [r.id, r.name]));
}

/** Names used in the `sports` table (see scripts/seed.ts). */
const SPORT_TABLE_NAMES: Record<SportId, string[]> = {
  football: ["Football", "Soccer"],
  basketball: ["Basketball"],
  tennis: ["Lawn Tennis", "Tennis"],
  track: ["Track & Field", "Track", "Athletics"],
  volleyball: ["Volleyball"],
};

/** Canonical rows required for live Score onboarding. */
export const SCORE_SPORT_SEED = [
  { name: "Football", type: "team", score_type: "points" },
  { name: "Basketball", type: "team", score_type: "points" },
  { name: "Lawn Tennis", type: "individual", score_type: "sets" },
  { name: "Volleyball", type: "team", score_type: "sets" },
  { name: "Track & Field", type: "individual", score_type: "time" },
] as const;

const cache = new Map<SportId, string>();

/**
 * Idempotent sports bootstrap. Safe to call on every admin write —
 * Score cannot resolve `sport-football` without these rows.
 */
export async function ensureSportsSeeded(
  supabase: Supabase
): Promise<{ ok: true } | { error: string }> {
  const { error } = (await (supabase.from("sports") as ReturnType<typeof supabase.from>).upsert(
    SCORE_SPORT_SEED.map((r) => ({ ...r })) as Record<string, unknown>[],
    { onConflict: "name" }
  )) as { error: { message: string } | null };

  if (error) {
    return {
      error: `Could not seed sports (${error.message}). Run supabase/score_seed_sports.sql in the same Supabase project as Score’s Vercel env.`,
    };
  }
  cache.clear();
  return { ok: true };
}

async function lookupSportId(
  supabase: Supabase,
  sport: SportId
): Promise<{ id: string } | { error: string; code?: string }> {
  const names = SPORT_TABLE_NAMES[sport] ?? [];
  const { data, error } = (await supabase
    .from("sports")
    .select("id, name")
    .in("name", names)
    .limit(1)
    .maybeSingle()) as {
    data: { id: string; name: string } | null;
    error: { message: string; code?: string } | null;
  };

  if (error) {
    return {
      error: `Sports lookup failed: ${error.message}`,
      code: error.code,
    };
  }
  if (!data) return { error: `Sport “${sport}” is not set up in the database yet` };
  return { id: data.id };
}

/**
 * Demo fixtures use slugs like `sport-football`; the live `sports` table uses
 * UUIDs. Resolve either form to the UUID the database expects.
 * If the row is missing, attempt a one-shot seed then retry (live onboarding).
 */
export async function resolveSportUuid(
  supabase: Supabase,
  sportDbIdOrSlug: string
): Promise<string | { error: string }> {
  if (!sportDbIdOrSlug.startsWith("sport-") && !/^[a-z]+$/.test(sportDbIdOrSlug)) {
    return sportDbIdOrSlug; // already a UUID
  }
  const sport: SportId = sportDbIdOrSlug.startsWith("sport-")
    ? dbIdToSport(sportDbIdOrSlug)
    : (sportDbIdOrSlug as SportId);

  const cached = cache.get(sport);
  if (cached) return cached;

  let found = await lookupSportId(supabase, sport);
  if ("id" in found) {
    cache.set(sport, found.id);
    return found.id;
  }

  // Empty or unseeded project — bootstrap then retry once.
  const seeded = await ensureSportsSeeded(supabase);
  if ("error" in seeded) {
    return {
      error: `${found.error}. ${seeded.error}`,
    };
  }

  found = await lookupSportId(supabase, sport);
  if ("id" in found) {
    cache.set(sport, found.id);
    return found.id;
  }

  return {
    error: `${found.error}. Confirm Vercel NEXT_PUBLIC_SUPABASE_URL points at the project where you ran the Score schema, then run: SELECT name FROM sports;`,
  };
}
