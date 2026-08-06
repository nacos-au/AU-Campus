/**
 * Instagram / X style handles — lowercase, uniform, unique.
 * Allowed: a–z, 0–9, underscore, period. 3–30 chars.
 * Must start & end with alphanumeric; no consecutive periods.
 */

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]*[a-z0-9])?$/;

const RESERVED = new Set([
  "admin",
  "administrator",
  "auscore",
  "aucampus",
  "audigest",
  "campus",
  "digest",
  "help",
  "mod",
  "moderator",
  "official",
  "root",
  "score",
  "staff",
  "support",
  "system",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw);
  if (!username) return { ok: false, error: "Username is required." };
  if (username.length < USERNAME_MIN) {
    return { ok: false, error: `Username must be at least ${USERNAME_MIN} characters.` };
  }
  if (username.length > USERNAME_MAX) {
    return { ok: false, error: `Username must be ${USERNAME_MAX} characters or fewer.` };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error:
        "Usernames can only use letters, numbers, underscores, and periods — and must start and end with a letter or number.",
    };
  }
  if (username.includes("..")) {
    return { ok: false, error: "Usernames cannot have consecutive periods." };
  }
  if (RESERVED.has(username)) {
    return { ok: false, error: "That username is reserved. Try another." };
  }
  return { ok: true, username };
}

export const USERNAME_HINT =
  "3–30 characters. Letters, numbers, _ and . only — like Instagram or X.";
