import { test } from "node:test";
import assert from "node:assert/strict";
import { legalShortName, parseNameMode, playerDisplayName } from "@/lib/players/display-name";

const withNick = { first_name: "Chukwuemeka", last_name: "Okafor", nickname: "Emeka" };
const noNick = { first_name: "Ada", last_name: "Obi", nickname: null };

test("legal mode shows the legal name", () => {
  assert.equal(playerDisplayName(withNick, "legal"), "Chukwuemeka Okafor");
  assert.equal(playerDisplayName(withNick, "legal", { short: true }), "C. Okafor");
});

test("nickname mode shows the nickname", () => {
  assert.equal(playerDisplayName(withNick, "nickname"), "Emeka");
});

test("nickname mode falls back to the legal name when there is none", () => {
  assert.equal(playerDisplayName(noNick, "nickname"), "Ada Obi");
  assert.equal(playerDisplayName({ first_name: "Ada", last_name: "Obi", nickname: "  " }, "nickname"), "Ada Obi");
});

test("short names handle missing parts", () => {
  assert.equal(legalShortName({ first_name: "", last_name: "" }), "");
  assert.equal(legalShortName({ first_name: "Ada", last_name: "" }), "Ada");
});

test("unknown stored mode defaults to legal", () => {
  assert.equal(parseNameMode("nickname"), "nickname");
  assert.equal(parseNameMode("weird"), "legal");
  assert.equal(parseNameMode(null), "legal");
});
