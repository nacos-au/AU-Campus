import { test } from "node:test";
import assert from "node:assert/strict";
import { footballStatTiles, summarizePlayerStats } from "@/lib/players/player-stats";

const P = "p1";

test("starters, subs on and scorers all count as appearances once per match", () => {
  const stats = summarizePlayerStats({
    playerId: P,
    lineups: [
      { match_id: "m1", players: [{ player_id: P, is_starting: true }] },
      { match_id: "m2", players: [{ player_id: P, is_starting: false }] },
    ],
    events: [
      { match_id: "m1", event_type: "goal", player_id: P },
      { match_id: "m2", event_type: "substitution", player_id: "other", details: { player_in_id: P } },
      { match_id: "m3", event_type: "goal", player_id: P },
    ],
  });
  assert.equal(stats.appearances, 3);
  assert.equal(stats.goals, 2);
});

test("a named bench player who never came on has no appearance", () => {
  const stats = summarizePlayerStats({
    playerId: P,
    lineups: [{ match_id: "m1", players: [{ player_id: P, is_starting: false }] }],
    events: [],
  });
  assert.equal(stats.appearances, 0);
});

test("assists skip pending and solo goals; own goals and shootout kicks are not goals", () => {
  const stats = summarizePlayerStats({
    playerId: P,
    lineups: [],
    events: [
      { match_id: "m1", event_type: "goal", player_id: "x", details: { assist_player_id: P } },
      { match_id: "m1", event_type: "goal", player_id: "x", details: { assist_player_id: P, assist_pending: true } },
      { match_id: "m1", event_type: "goal", player_id: "x", details: { assist_player_id: P, solo_goal: true } },
      { match_id: "m1", event_type: "own_goal", player_id: P },
      { match_id: "m1", event_type: "penalty_scored", player_id: P, period: "penalty_shootout" },
      { match_id: "m1", event_type: "penalty_scored", player_id: P },
    ],
  });
  assert.equal(stats.assists, 1);
  assert.equal(stats.goals, 1);
});

test("cards are counted per colour and do not create an appearance on their own", () => {
  const stats = summarizePlayerStats({
    playerId: P,
    lineups: [],
    events: [
      { match_id: "m1", event_type: "yellow_card", player_id: P },
      { match_id: "m1", event_type: "yellow_card", player_id: P },
      { match_id: "m2", event_type: "red_card", player_id: P },
      { match_id: "m2", event_type: "yellow_card", player_id: "someone-else" },
    ],
  });
  assert.equal(stats.yellow_cards, 2);
  assert.equal(stats.red_cards, 1);
  assert.equal(stats.appearances, 0);
});

test("football tiles total cards and only add a note when there are cards", () => {
  const none = footballStatTiles({ appearances: 2, goals: 1, assists: 0, yellow_cards: 0, red_cards: 0 });
  assert.equal(none.find((t) => t.label === "Cards")?.note, undefined);
  const some = footballStatTiles({ appearances: 2, goals: 1, assists: 0, yellow_cards: 2, red_cards: 1 });
  const cards = some.find((t) => t.label === "Cards");
  assert.equal(cards?.value, 3);
  assert.equal(cards?.note, "2 yellow · 1 red");
});
