import { test } from "node:test";
import assert from "node:assert/strict";
import { clubCrestCode, queryClubDirectory } from "@/lib/data/club-directory-query";
import { FOOTBALL_UUID, fakeSupabase } from "@/lib/testing/fake-supabase";

const teams = [
  { id: "t1", name: "Computer Science FC", department: { short_code: "CSC" } },
  { id: "t2", name: "Visitors United", department: null },
];

test("lists active teams for the sport using the resolved UUID", async () => {
  const fake = fakeSupabase({ teams: () => ({ data: teams, error: null }) });
  const result = await queryClubDirectory(fake.client, "sport-football");
  assert.equal(result.length, 2);
  assert.equal(fake.callsFor("teams")[0].eq.sport_id, FOOTBALL_UUID);
  assert.equal(fake.callsFor("tournament_teams").length, 0);
});

test("a competition filter limits the list to its registered teams", async () => {
  const fake = fakeSupabase({
    tournament_teams: () => ({ data: [{ team_id: "t1" }], error: null }),
    teams: () => ({ data: [teams[0]], error: null }),
  });
  const result = await queryClubDirectory(fake.client, "sport-football", "comp-1");
  assert.equal(result.length, 1);
  assert.equal(fake.callsFor("tournament_teams")[0].eq.tournament_id, "comp-1");
  assert.deepEqual(fake.callsFor("teams")[0].in.id, ["t1"]);
});

test("a competition with no registered teams is empty and skips the teams query", async () => {
  const fake = fakeSupabase({ tournament_teams: () => ({ data: [], error: null }) });
  assert.deepEqual(await queryClubDirectory(fake.client, "sport-football", "comp-1"), []);
  assert.equal(fake.callsFor("teams").length, 0);
});

test("a read error returns an empty list instead of throwing", async () => {
  const fake = fakeSupabase({ teams: () => ({ data: null, error: { message: "denied" } }) });
  assert.deepEqual(await queryClubDirectory(fake.client, "sport-football"), []);
});

test("crest code uses the department, else guest initials", () => {
  assert.equal(clubCrestCode({ name: "Computer Science FC", department: { short_code: "CSC" } as never }), "CSC");
  assert.equal(clubCrestCode({ name: "Visitors United", department: undefined }), "VU");
  assert.equal(clubCrestCode({ name: "", department: undefined }), "AU");
});
