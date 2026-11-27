import { test } from "node:test";
import assert from "node:assert/strict";
import { completeStartingXi, formationTargets, positionGroup, type PoolPlayer } from "@/lib/match/lineup-merge";

function squad(): PoolPlayer[] {
  const rows: Array<[string, string]> = [
    ["GK", "GK"], ["LB", "LB"], ["CB1", "CB"], ["CB2", "CB"], ["RB", "RB"],
    ["CM1", "CM"], ["CM2", "CDM"], ["CAM", "CAM"],
    ["LW", "LW"], ["ST", "ST"], ["RW", "RW"],
    ["SUB1", "CB"], ["SUB2", "CM"], ["SUB3", "ST"],
  ];
  return rows.map(([id, pos], i) => ({
    player_id: id,
    position: pos,
    jersey_number: i + 1,
    available: true,
  }));
}

test("position groups come from the stored role", () => {
  assert.equal(positionGroup("GK"), "GK");
  assert.equal(positionGroup("CB, CDM"), "DEF");
  assert.equal(positionGroup("CDM"), "MID");
  assert.equal(positionGroup("ST"), "FWD");
  assert.equal(positionGroup(null), "OTHER");
});

test("formation targets fit 11 starters and reject mismatches", () => {
  assert.deepEqual(formationTargets("4-3-3", 11), { GK: 1, DEF: 4, MID: 3, FWD: 3, OTHER: 0 });
  assert.deepEqual(formationTargets("4-2-3-1", 11), { GK: 1, DEF: 4, MID: 5, FWD: 1, OTHER: 0 });
  assert.equal(formationTargets("4-3-3", 5), null);
});

test("goalkeepers-only sheet is completed to a full XI from the squad, rest goes to the bench", () => {
  const sheet = [
    { player_id: "GK", is_starting: true, role: "GK" },
    { player_id: "GK2", is_starting: true, role: "GK" },
  ];
  const pool = [
    ...squad(),
    { player_id: "GK2", position: "GK", jersey_number: 12, available: true },
  ];
  const result = completeStartingXi({ sheet, pool, starters: 11, formation: "4-3-3" });

  const starters = result.players.filter((p) => p.is_starting);
  const bench = result.players.filter((p) => !p.is_starting);
  assert.equal(starters.length, 11);
  assert.equal(result.complete, true);
  assert.ok(starters.some((p) => p.player_id === "GK"), "submitted keeper stays in the XI");
  assert.equal(
    starters.filter((p) => p.role === "GK" || pool.find((x) => x.player_id === p.player_id)?.position === "GK").length,
    2,
    "two keepers appear because both were logged, no third is picked"
  );
  assert.equal(new Set(result.players.map((p) => p.player_id)).size, result.players.length, "no duplicates");
  assert.ok(bench.length >= 1, "substitutes are the rest of the squad");
  assert.ok(result.autoFilledIds.length > 0);
});

test("unavailable players are not auto-picked as starters", () => {
  const pool = squad().map((p) => (p.player_id === "ST" ? { ...p, available: false } : p));
  const result = completeStartingXi({ sheet: [], pool, starters: 11, formation: "4-3-3" });
  assert.equal(result.players.some((p) => p.player_id === "ST" && p.is_starting), false);
  assert.equal(result.players.some((p) => p.player_id === "ST" && !p.is_starting), true);
});

test("a complete submitted XI is returned unchanged", () => {
  const sheet = squad().slice(0, 11).map((p) => ({ player_id: p.player_id, is_starting: true, role: p.position }));
  const result = completeStartingXi({ sheet, pool: squad(), starters: 11, formation: "4-3-3" });
  assert.equal(result.complete, true);
  assert.deepEqual(result.autoFilledIds, []);
  assert.equal(result.players, sheet);
});

test("short squad leaves the XI incomplete rather than inventing players", () => {
  const pool = squad().slice(0, 4);
  const result = completeStartingXi({ sheet: [], pool, starters: 11, formation: "4-3-3" });
  assert.equal(result.complete, false);
  assert.equal(result.players.filter((p) => p.is_starting).length, 4);
});
