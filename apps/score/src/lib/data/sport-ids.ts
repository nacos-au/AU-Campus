import type { createClient } from "@/lib/supabase/server";
import { dbIdToSport, type SportId } from "@/lib/utils/sport";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Names used in the `sports` table (see scripts/seed.ts). */
const SPORT_TABLE_NAMES: Record<SportId, string[]> = {
  football: ["Football", "Soccer"],
  basketball: ["Basketball"],
  tennis: ["Lawn Tennis", "Tennis"],
  track: ["Track & Field", "Track", "Athletics"],
  volleyball: ["Volleyball"],
};

const cache = new Map<SportId, string>();

/**
 * Demo fixtures use slugs like `sport-football`; the live `sports` table uses
 * UUIDs. Resolve either form to the UUID the database expects.
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

  const { data } = (await supabase
    .from("sports")
    .select("id, name")
    .in("name", SPORT_TABLE_NAMES[sport] ?? [])
    .limit(1)
    .maybeSingle()) as { data: { id: string; name: string } | null };

  if (!data) return { error: `Sport “${sport}” is not set up in the database yet` };
  cache.set(sport, data.id);
  return data.id;
}
