import { test } from "node:test";
import assert from "node:assert/strict";
import { queryHeadToHeadMatches } from "@/lib/data/head-to-head-query";
import type { Supabase } from "@/lib/data/sport-ids";

const FOOTBALL_UUID = "9b1e0c2a-1111-4222-8333-444455556666";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Minimal Supabase stand-in. Like Postgres, a non-UUID value in the UUID column
 * `matches.sport_id` returns an error instead of matching nothing. That is the
 * behaviour that made head-to-head silently empty on live.
 */
function fakeSupabase(matchRows: unknown[] | null, matchError: { message: string } | null = null) {
  const matchFilters: Record<string, unknown> = {};
  let orClause = "";

  const from = (table: string) => {
    const state: Record<string, unknown> = {};
    const api = {
      select: () => api,
      in: () => api,
      limit: () => api,
      is: () => api,
      order: () => api,
      eq: (col: string, val: unknown) => {
        state[col] = val;
        if (table === "matches") matchFilters[col] = val;
        return api;
      },
      or: (clause: string) => {
        if (table === "matches") orClause = clause;
        return api;
      },
      maybeSingle: async () =>
        table === "sports" ? { data: { id: FOOTBALL_UUID, name: "Football" }, error: null } : { data: null, error: null },
      then: (resolve: (v: unknown) => void) => {
        if (table !== "matches") return resolve({ data: null, error: null });
        const sport = state.sport_id;
        if (typeof sport === "string" && !UUID.test(sport)) {
          return resolve({
            data: null,
            error: { message: `invalid input syntax for type uuid: "${sport}"` },
          });
        }
        return resolve({ data: matchError ? null : matchRows, error: matchError });
      },
    };
    return api;
  };

  return {
    client: { from } as unknown as Supabase,
    matchFilters,
    orClause: () => orClause,
  };
}

test("filters matches by the sport UUID, not the slug", async () => {
  const rows = [{ id: "m1", status: "completed" }];
  const fake = fakeSupabase(rows);
  const result = await queryHeadToHeadMatches(fake.client, "sport-football", "team-a", "team-b");
  assert.deepEqual(result, rows);
  assert.equal(fake.matchFilters.sport_id, FOOTBALL_UUID);
});

test("matches either home/away orientation of the two teams", async () => {
  const fake = fakeSupabase([]);
  await queryHeadToHeadMatches(fake.client, "sport-football", "team-a", "team-b");
  const clause = fake.orClause();
  assert.ok(clause.includes("and(home_team_id.eq.team-a,away_team_id.eq.team-b)"));
  assert.ok(clause.includes("and(home_team_id.eq.team-b,away_team_id.eq.team-a)"));
});

test("a read error returns no meetings instead of throwing", async () => {
  const fake = fakeSupabase(null, { message: "permission denied" });
  const result = await queryHeadToHeadMatches(fake.client, "sport-football", "team-a", "team-b");
  assert.deepEqual(result, []);
});
