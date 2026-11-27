import { test } from "node:test";
import assert from "node:assert/strict";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { buildScorers, formatScorerLine, minuteSortKey } from "@/lib/match/scorers";
import { displayMatchTime } from "@/lib/match/timeline";

const HOME = "team-home";
const AWAY = "team-away";

function ev(partial: Partial<DemoMatchEvent> & { event_type: string; team_id: string }): DemoMatchEvent {
  return {
    id: `${partial.event_type}-${partial.match_time ?? "x"}-${Math.random()}`,
    match_id: "m1",
    player: { id: "p", first_name: "", last_name: "" } as DemoMatchEvent["player"],
    team_name: "",
    team_code: "",
    team_logo_url: null,
    match_time: "",
    period: "half_1",
    details: null,
    ...partial,
  } as DemoMatchEvent;
}

test("football minutes get an apostrophe, other sports and placeholders do not", () => {
  assert.equal(displayMatchTime("23", "football"), "23'");
  assert.equal(displayMatchTime("90+3", "football"), "90+3'");
  assert.equal(displayMatchTime("ET 105", "football"), "ET 105'");
  assert.equal(displayMatchTime("23'", "football"), "23'");
  assert.equal(displayMatchTime("?", "football"), null);
  assert.equal(displayMatchTime("", "football"), null);
  assert.equal(displayMatchTime("02:14", "basketball"), "02:14");
});

test("minute sort key handles stoppage and extra time", () => {
  assert.ok(minuteSortKey("90+3") > minuteSortKey("90"));
  assert.ok(minuteSortKey("ET 105") > minuteSortKey("90+3"));
});

test("scorers group by player with minutes, tag own goals and penalties", () => {
  const scorer = { id: "p-soria", first_name: "Matteo", last_name: "Soria" } as DemoMatchEvent["player"];
  const events = [
    ev({ event_type: "goal", team_id: HOME, match_time: "15", player: scorer }),
    ev({ event_type: "goal", team_id: HOME, match_time: "18", player: scorer }),
    ev({
      event_type: "penalty_scored",
      team_id: AWAY,
      match_time: "70",
      player: { id: "p-x", first_name: "Ada", last_name: "Eze" } as DemoMatchEvent["player"],
    }),
    ev({
      event_type: "own_goal",
      team_id: HOME,
      match_time: "80",
      player: { id: "p-h", first_name: "Tobi", last_name: "Ade" } as DemoMatchEvent["player"],
    }),
  ];
  const { home, away } = buildScorers(events, HOME, AWAY);

  assert.equal(home.length, 1);
  assert.equal(home[0].name, "Matteo Soria");
  assert.deepEqual(home[0].minutes.map((m) => m.label), ["15'", "18'"]);
  assert.equal(formatScorerLine(home[0]), "Matteo Soria 15', 18'");

  // Own goal by the home side counts for away, listed under away with OG.
  // Latest scorer first, as on the reference banner.
  assert.deepEqual(
    away.map((l) => l.name),
    ["Tobi Ade", "Ada Eze"]
  );
  assert.equal(away[0].minutes[0].tag, "OG");
  assert.equal(away[1].minutes[0].tag, "P");
});

test("score-only records and shootout kicks produce no scorer lines", () => {
  assert.deepEqual(buildScorers([], HOME, AWAY), { home: [], away: [] });
  const shootout = [
    ev({ event_type: "penalty_scored", team_id: HOME, match_time: "", period: "penalty_shootout" }),
  ];
  assert.deepEqual(buildScorers(shootout, HOME, AWAY), { home: [], away: [] });
});

test("goal without a logged minute shows the name with no minute mark", () => {
  const { home } = buildScorers(
    [ev({ event_type: "goal", team_id: HOME, match_time: "", player: { id: "p", first_name: "Sam", last_name: "Lee" } as DemoMatchEvent["player"] })],
    HOME,
    AWAY
  );
  assert.equal(formatScorerLine(home[0]), "Sam Lee");
});
