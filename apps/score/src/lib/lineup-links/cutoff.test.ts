import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clampCutoffMinutes,
  cutoffAt,
  describeCutoff,
  effectiveCutoffMinutes,
  isSubmissionClosed,
} from "./cutoff";
import { hashLineupToken, looksLikeLineupToken, newLineupToken } from "./token";

test("effective cut-off: link override beats competition default beats 60", () => {
  assert.equal(effectiveCutoffMinutes(30, 90), 30);
  assert.equal(effectiveCutoffMinutes(null, 90), 90);
  assert.equal(effectiveCutoffMinutes(undefined, null), 60);
  assert.equal(effectiveCutoffMinutes(0, 60), 0);
});

test("clampCutoffMinutes rejects junk and out-of-range values", () => {
  assert.equal(clampCutoffMinutes("45"), 45);
  assert.equal(clampCutoffMinutes(-1), null);
  assert.equal(clampCutoffMinutes(1441), null);
  assert.equal(clampCutoffMinutes("abc"), null);
});

test("submissions close exactly at the cut-off", () => {
  const kickoff = "2026-11-28T15:00:00.000Z";
  assert.equal(cutoffAt(kickoff, 60).toISOString(), "2026-11-28T14:00:00.000Z");
  assert.equal(isSubmissionClosed(kickoff, 60, new Date("2026-11-28T13:59:59.000Z")), false);
  assert.equal(isSubmissionClosed(kickoff, 60, new Date("2026-11-28T14:00:00.000Z")), true);
});

test("describeCutoff reads naturally", () => {
  assert.equal(describeCutoff(60), "1 hour before kickoff");
  assert.equal(describeCutoff(90), "1 hour 30 minutes before kickoff");
  assert.equal(describeCutoff(15), "15 minutes before kickoff");
});

test("tokens are url-safe, hash deterministically, and differ per call", () => {
  const a = newLineupToken();
  const b = newLineupToken();
  assert.notEqual(a, b);
  assert.ok(looksLikeLineupToken(a));
  assert.equal(hashLineupToken(a), hashLineupToken(a));
  assert.equal(hashLineupToken(a).length, 64);
  assert.equal(looksLikeLineupToken("short"), false);
});
