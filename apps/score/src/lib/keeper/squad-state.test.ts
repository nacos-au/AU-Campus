import { test } from "node:test";
import assert from "node:assert/strict";
import type { SquadPlayer } from "@/lib/data/demo-squads";
import { splitSquad, subPairsFromLogs } from "@/lib/keeper/squad-state";

function squad(n: number): SquadPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    department_id: "",
    first_name: `F${i}`,
    last_name: `L${String(i).padStart(2, "0")}`,
    matric_number: null,
    avatar_url: null,
    position: null,
    jersey_number: i + 1,
    squad_role: i < 11 ? "Starting" : "Bench",
  }));
}

test("splits XI and bench from roles", () => {
  const s = splitSquad(squad(16));
  assert.equal(s.xi.length, 11);
  assert.equal(s.bench.length, 5);
  assert.equal(s.subbedOff.length, 0);
});

test("a sub moves the incoming player into the XI and the outgoing player off", () => {
  const s = splitSquad(squad(16), [{ outId: "p3", inId: "p12" }]);
  assert.equal(s.xi.length, 11);
  assert.ok(s.xi.some((p) => p.id === "p12"));
  assert.ok(!s.xi.some((p) => p.id === "p3"));
  assert.ok(!s.bench.some((p) => p.id === "p12"));
  assert.deepEqual(s.subbedOff.map((p) => p.id), ["p3"]);
});

test("a subbed-off player cannot be brought back from the bench", () => {
  const s = splitSquad(squad(16), [{ outId: "p3", inId: "p12" }]);
  assert.ok(!s.bench.some((p) => p.id === "p3"));
});

test("without roles the squad splits by jersey order", () => {
  const players = squad(14).map((p) => ({ ...p, squad_role: "Squad" }));
  const s = splitSquad(players);
  assert.equal(s.xi.length, 11);
  assert.equal(s.bench.length, 3);
});

test("subPairsFromLogs reads one team's substitutions", () => {
  const pairs = subPairsFromLogs(
    [
      { event_type: "substitution", team_id: "a", details: { player_out_id: "p1", player_in_id: "p12" } },
      { event_type: "substitution", team_id: "b", details: { player_out_id: "q1", player_in_id: "q12" } },
      { event_type: "goal", team_id: "a", details: null },
    ],
    "a"
  );
  assert.deepEqual(pairs, [{ outId: "p1", inId: "p12" }]);
});
