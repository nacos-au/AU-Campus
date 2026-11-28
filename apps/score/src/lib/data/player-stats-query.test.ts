import { test } from "node:test";
import assert from "node:assert/strict";
import { queryPlayerStats } from "@/lib/data/player-stats-query";
import { FOOTBALL_UUID, fakeSupabase } from "@/lib/testing/fake-supabase";

const P = "player-1";

test("resolves the sport slug to a UUID and totals the player's stats", async () => {
  const fake = fakeSupabase({
    player_sport_registry: () => ({ data: [{ team_id: "t1" }], error: null }),
    matches: () => ({ data: [{ id: "m1" }, { id: "m2" }], error: null }),
    match_events: () => ({
      data: [
        { match_id: "m1", event_type: "goal", player_id: P, details: {} },
        { match_id: "m2", event_type: "yellow_card", player_id: P, details: {} },
        { match_id: "m2", event_type: "goal", player_id: "x", details: { assist_player_id: P } },
      ],
      error: null,
    }),
    match_lineups: () => ({
      data: [{ match_id: "m1", players: [{ player_id: P, is_starting: true }] }],
      error: null,
    }),
  });

  const stats = await queryPlayerStats(fake.client, P, "sport-football");
  assert.deepEqual(stats, { appearances: 2, goals: 1, assists: 1, yellow_cards: 1, red_cards: 0 });

  assert.equal(fake.callsFor("player_sport_registry")[0].eq["team.sport_id"], FOOTBALL_UUID);
  assert.equal(fake.callsFor("matches")[0].eq.sport_id, FOOTBALL_UUID);
});

test("only this player's events are requested", async () => {
  const fake = fakeSupabase({
    player_sport_registry: () => ({ data: [{ team_id: "t1" }], error: null }),
    matches: () => ({ data: [{ id: "m1" }], error: null }),
    match_events: () => ({ data: [], error: null }),
    match_lineups: () => ({ data: [], error: null }),
  });
  await queryPlayerStats(fake.client, P, "sport-football");
  const clause = fake.callsFor("match_events")[0].or[0];
  assert.ok(clause.includes(`player_id.eq.${P}`));
  assert.ok(clause.includes(`details->>assist_player_id.eq.${P}`));
  assert.ok(clause.includes(`details->>player_in_id.eq.${P}`));
});

test("a player with no club in the sport has zeros and triggers no match queries", async () => {
  const fake = fakeSupabase({
    player_sport_registry: () => ({ data: [], error: null }),
  });
  const stats = await queryPlayerStats(fake.client, P, "sport-football");
  assert.deepEqual(stats, { appearances: 0, goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 });
  assert.equal(fake.callsFor("matches").length, 0);
});

test("long match lists are queried in chunks", async () => {
  const ids = Array.from({ length: 170 }, (_, i) => ({ id: `m${i}` }));
  const fake = fakeSupabase({
    player_sport_registry: () => ({ data: [{ team_id: "t1" }], error: null }),
    matches: () => ({ data: ids, error: null }),
    match_events: () => ({ data: [], error: null }),
    match_lineups: () => ({ data: [], error: null }),
  });
  await queryPlayerStats(fake.client, P, "sport-football");
  assert.equal(fake.callsFor("match_events").length, 3);
  assert.ok(fake.callsFor("match_events").every((c) => (c.in.match_id?.length ?? 0) <= 80));
});

test("a read error returns null rather than zeros that look real", async () => {
  const fake = fakeSupabase({
    player_sport_registry: () => ({ data: [{ team_id: "t1" }], error: null }),
    matches: () => ({ data: [{ id: "m1" }], error: null }),
    match_events: () => ({ data: null, error: { message: "boom" } }),
  });
  assert.equal(await queryPlayerStats(fake.client, P, "sport-football"), null);
});
