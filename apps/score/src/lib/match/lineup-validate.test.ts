import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLineupSheet, type LineupValidationInput } from "@/lib/match/lineup-validate";

function base(overrides: Partial<LineupValidationInput> = {}): LineupValidationInput {
  const players = Array.from({ length: 11 }, (_, i) => ({
    player_id: `p${i}`,
    is_starting: true,
    is_captain: i === 0,
  }));
  const bench = [{ player_id: "b1", is_starting: false }, { player_id: "b2", is_starting: false }];
  return {
    players: [...players, ...bench],
    starters: 11,
    formation: "4-3-3",
    squadIds: null,
    suspendedIds: new Set(),
    availability: new Map(),
    mode: "staff",
    ...overrides,
  };
}

test("a valid sheet has no errors or warnings", () => {
  const r = validateLineupSheet(base());
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("wrong starter count, missing bench and missing captain are errors", () => {
  const input = base();
  input.players = input.players.slice(1).map((p) => ({ ...p, is_captain: false }));
  const r = validateLineupSheet(input);
  assert.ok(r.errors.some((e) => e.includes("exactly 11")));
  assert.ok(r.errors.some((e) => e.includes("captain")));
});

test("captain must be a starter", () => {
  const input = base();
  input.players = input.players.map((p) => (p.player_id === "b1" ? { ...p, is_captain: true } : p));
  const r = validateLineupSheet(input);
  assert.ok(r.errors.some((e) => e.includes("captain must be in the starting XI") || e.includes("Only one captain")));
});

test("players off the competition squad are errors", () => {
  const r = validateLineupSheet(base({ squadIds: new Set(["p0"]) }));
  assert.ok(r.errors.some((e) => e.includes("not on the competition squad")));
});

test("suspended players are always blocked", () => {
  const r = validateLineupSheet(base({ suspendedIds: new Set(["p3"]), mode: "staff" }));
  assert.ok(r.errors.some((e) => e.includes("suspended")));
});

test("injured players are warnings for staff and errors for reps", () => {
  const availability = new Map([["p4", "injured" as const]]);
  const staff = validateLineupSheet(base({ availability, mode: "staff" }));
  assert.deepEqual(staff.errors, []);
  assert.ok(staff.warnings.some((w) => w.includes("injured")));

  const rep = validateLineupSheet(base({ availability, mode: "rep" }));
  assert.ok(rep.errors.some((e) => e.includes("injured")));
});

test("duplicate players are rejected", () => {
  const input = base();
  input.players = [...input.players, { player_id: "p1", is_starting: false }];
  const r = validateLineupSheet(input);
  assert.ok(r.errors.some((e) => e.includes("more than once")));
});
