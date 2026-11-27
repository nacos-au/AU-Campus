import { test } from "node:test";
import assert from "node:assert/strict";
import { explicitStatRows } from "@/lib/match/match-stats";

const H = "h";
const A = "a";

test("no logged stats means no rows, so the card is hidden", () => {
  assert.deepEqual(explicitStatRows([], H, A), []);
  assert.deepEqual(
    explicitStatRows(
      [
        { team_id: H, shots_on_target: null, saves: null, corners: null, fouls: null, offsides: null, yellow_cards: null, red_cards: null },
        { team_id: A, shots_on_target: null, saves: null, corners: null, fouls: null, offsides: null, yellow_cards: null, red_cards: null },
      ],
      H,
      A
    ),
    []
  );
});

test("only fields recorded for at least one side appear", () => {
  const rows = explicitStatRows(
    [
      { team_id: H, shots_on_target: 5, saves: null, corners: 3, fouls: null, offsides: null, yellow_cards: null, red_cards: null },
      { team_id: A, shots_on_target: 2, saves: null, corners: null, fouls: null, offsides: null, yellow_cards: null, red_cards: null },
    ],
    H,
    A
  );
  assert.deepEqual(rows, [
    { label: "Shots on target", home: 5, away: 2 },
    { label: "Corners", home: 3, away: null },
  ]);
});
