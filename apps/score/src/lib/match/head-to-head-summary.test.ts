import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeHeadToHead, type HeadToHeadMatchRow } from "@/lib/match/head-to-head-summary";

const A = "team-a";
const B = "team-b";

const rows: HeadToHeadMatchRow[] = [
  {
    id: "m1",
    scheduled_at: "2026-10-01T15:00:00Z",
    home_team_id: A,
    away_team_id: B,
    home_score: 2,
    away_score: 0,
    tournament: { name: "League" },
    home_team: { name: "CSC FC", department: { short_code: "CSC" } },
    away_team: { name: "Law", department: { short_code: "LAW" } },
  },
  {
    id: "m2",
    scheduled_at: "2026-11-01T15:00:00Z",
    home_team_id: B,
    away_team_id: A,
    home_score: 1,
    away_score: 1,
    home_team: { name: "Law", department: { short_code: "LAW" } },
    away_team: { name: "CSC FC", department: { short_code: "CSC" } },
  },
  {
    id: "m3",
    scheduled_at: "2026-09-01T15:00:00Z",
    home_team_id: A,
    away_team_id: B,
    home_score: 0,
    away_score: 3,
  },
];

test("summary counts results from team A's perspective, newest first", () => {
  const s = summarizeHeadToHead(rows, A);
  assert.equal(s.wins, 1);
  assert.equal(s.draws, 1);
  assert.equal(s.losses, 1);
  assert.deepEqual(s.meetings.map((m) => m.match_id), ["m2", "m1", "m3"]);
});

test("crest codes come from the department, blank when unknown", () => {
  const s = summarizeHeadToHead(rows, A);
  const m1 = s.meetings.find((m) => m.match_id === "m1")!;
  assert.equal(m1.home_code, "CSC");
  assert.equal(m1.away_code, "LAW");
  const m3 = s.meetings.find((m) => m.match_id === "m3")!;
  assert.equal(m3.home_code, "");
  assert.equal(m3.home_team_name, "Home");
});

test("excluded match and deleted matches are not counted", () => {
  const s = summarizeHeadToHead([...rows, { ...rows[0], id: "gone", deleted_at: "2026-01-01" }], A, "m2");
  assert.equal(s.meetings.length, 2);
  assert.equal(s.meetings.some((m) => m.match_id === "gone"), false);
});
