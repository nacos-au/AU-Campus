import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShiftEdits,
  formatWat,
  humanizePhase,
  isLockedStatus,
  isoToWatInput,
  planReschedule,
  selectFromHere,
  selectSameWeek,
  shiftIso,
  watInputToIso,
  type ScheduleRow,
} from "./shift-fixtures";

function row(
  n: number,
  iso: string | null,
  over: Partial<ScheduleRow> = {}
): ScheduleRow {
  return {
    key: `match:m${n}`,
    kind: "match",
    id: `m${n}`,
    title: `Match ${n}`,
    phase: `Matchday ${n}`,
    status: "scheduled",
    scheduled_at: iso,
    venue_id: "main",
    venue_name: "Main Field",
    home_team_id: `h${n}`,
    away_team_id: `a${n}`,
    original_scheduled_at: null,
    reschedule_count: 0,
    ...over,
  };
}

// 16:00 WAT == 15:00 UTC
const D13 = "2026-11-26T15:00:00.000Z";
const D14 = "2026-11-27T15:00:00.000Z";
const D15 = "2026-11-28T15:00:00.000Z";
const FUTURE_NOW = new Date("2026-11-20T00:00:00Z");

describe("WAT conversions", () => {
  it("shows a UTC instant as WAT wall clock for datetime-local", () => {
    assert.equal(isoToWatInput(D13), "2026-11-26T16:00");
  });

  it("reads a datetime-local value as WAT", () => {
    assert.equal(watInputToIso("2026-11-26T16:00"), D13);
  });

  it("round-trips", () => {
    assert.equal(watInputToIso(isoToWatInput(D14)), D14);
  });

  it("rejects malformed input", () => {
    assert.equal(watInputToIso("not a date"), null);
    assert.equal(watInputToIso(""), null);
  });

  it("formats in WAT", () => {
    assert.equal(formatWat(D13), "Thu 26 Nov, 16:00");
    assert.equal(formatWat(null), "No date");
  });
});

describe("shiftIso", () => {
  it("adds whole days", () => {
    assert.equal(shiftIso(D13, 1), D14);
    assert.equal(shiftIso(D13, 2), D15);
  });

  it("subtracts days and adds hours", () => {
    assert.equal(shiftIso(D14, -1), D13);
    assert.equal(shiftIso(D13, 0, 2), "2026-11-26T17:00:00.000Z");
  });

  it("keeps the WAT time of day when shifting by days", () => {
    assert.equal(isoToWatInput(shiftIso("2026-12-13T15:00:00.000Z", 2)), "2026-12-15T16:00");
    assert.equal(isoToWatInput(shiftIso("2026-12-13T15:00:00.000Z", 48)), "2027-01-30T16:00");
  });

  it("returns null for missing or invalid dates", () => {
    assert.equal(shiftIso(null, 1), null);
    assert.equal(shiftIso("nope", 1), null);
  });
});

describe("buildShiftEdits", () => {
  const rows = [row(13, D13), row(14, D14), row(15, D15)];

  it("shifts only the selected rows", () => {
    const { edits, skipped } = buildShiftEdits(rows, ["match:m14", "match:m15"], 2);
    assert.deepEqual(edits, {
      "match:m14": "2026-11-29T15:00:00.000Z",
      "match:m15": "2026-11-30T15:00:00.000Z",
    });
    assert.deepEqual(skipped, []);
  });

  it("skips locked and undated rows", () => {
    const mixed = [
      row(1, D13, { status: "completed" }),
      row(2, null, { kind: "bracket", key: "bracket:b1", id: "b1", status: "tbd" }),
      row(3, D15),
    ];
    const { edits, skipped } = buildShiftEdits(mixed, mixed.map((r) => r.key), 1);
    assert.deepEqual(Object.keys(edits), ["match:m3"]);
    assert.deepEqual(skipped.sort(), ["bracket:b1", "match:m1"]);
  });
});

describe("planReschedule", () => {
  const rows = [row(13, D13), row(14, D14), row(15, D15)];

  it("returns only rows that really change", () => {
    const plan = planReschedule(
      rows,
      { "match:m13": D13, "match:m14": "2026-11-29T15:00:00.000Z" },
      FUTURE_NOW
    );
    assert.equal(plan.changes.length, 1);
    assert.equal(plan.changes[0].id, "m14");
    assert.equal(plan.canApply, true);
  });

  it("blocks locked fixtures", () => {
    const locked = [row(1, D13, { status: "live" })];
    const plan = planReschedule(locked, { "match:m1": D14 }, FUTURE_NOW);
    assert.equal(plan.canApply, false);
    assert.equal(plan.warnings[0].level, "error");
  });

  it("treats a postponed match as movable even to the same time", () => {
    const postponed = [row(1, D13, { status: "postponed" })];
    const plan = planReschedule(postponed, { "match:m1": D13 }, FUTURE_NOW);
    assert.equal(plan.changes.length, 1);
  });

  it("warns about dates in the past without blocking", () => {
    const plan = planReschedule(rows, { "match:m13": "2026-01-01T15:00:00.000Z" }, FUTURE_NOW);
    assert.equal(plan.canApply, true);
    assert.ok(plan.warnings.some((w) => w.message.includes("past")));
  });

  it("warns on a same-venue, same-time clash", () => {
    const plan = planReschedule(rows, { "match:m14": D15 }, FUTURE_NOW);
    assert.ok(plan.warnings.some((w) => w.message.includes("Same venue")));
    assert.equal(plan.canApply, true);
  });

  it("warns when a team would play twice in a day", () => {
    const twice = [
      row(1, D13, { home_team_id: "x" }),
      row(2, D14, { home_team_id: "x" }),
    ];
    const plan = planReschedule(
      twice,
      { "match:m2": "2026-11-26T18:00:00.000Z" },
      FUTURE_NOW
    );
    assert.ok(plan.warnings.some((w) => w.message.includes("twice")));
  });

  it("does not warn about clashes that do not involve a changed row", () => {
    const clashing = [row(1, D13), row(2, D13), row(3, D15)];
    const plan = planReschedule(clashing, { "match:m3": D14 }, FUTURE_NOW);
    assert.equal(plan.warnings.length, 0);
  });

  it("rejects unknown rows and invalid dates", () => {
    const plan = planReschedule(rows, { "match:zzz": D14, "match:m13": "bad" }, FUTURE_NOW);
    assert.equal(plan.canApply, false);
    assert.equal(plan.warnings.filter((w) => w.level === "error").length, 2);
  });

  it("is not applicable when nothing changes", () => {
    assert.equal(planReschedule(rows, {}, FUTURE_NOW).canApply, false);
  });
});

describe("selection helpers", () => {
  it("selects a row and everything after it, skipping locked rows", () => {
    const rows = [
      row(1, D13, { status: "completed" }),
      row(2, D14),
      row(3, D15, { status: "live" }),
      row(4, "2026-11-29T15:00:00.000Z"),
    ];
    assert.deepEqual(selectFromHere(rows, "match:m2"), ["match:m2", "match:m4"]);
  });

  it("selects the Sun-Sat week of a row", () => {
    const rows = [
      row(1, "2026-11-28T15:00:00.000Z"), // Sat
      row(2, "2026-11-29T15:00:00.000Z"), // Sun, next week
      row(3, "2026-12-01T15:00:00.000Z"), // Tue, same week as Sun
    ];
    assert.deepEqual(selectSameWeek(rows, "match:m2"), ["match:m2", "match:m3"]);
  });
});

describe("misc", () => {
  it("locks started or finished fixtures", () => {
    assert.equal(isLockedStatus("match", "scheduled"), false);
    assert.equal(isLockedStatus("match", "postponed"), false);
    assert.equal(isLockedStatus("match", "live"), true);
    assert.equal(isLockedStatus("match", "completed"), true);
    assert.equal(isLockedStatus("bracket", "tbd"), false);
    assert.equal(isLockedStatus("bracket", "completed"), true);
  });

  it("humanizes phases", () => {
    assert.equal(humanizePhase("matchday_13"), "Matchday 13");
    assert.equal(humanizePhase("quarter_final"), "Quarter final");
    assert.equal(humanizePhase(null), null);
  });
});
