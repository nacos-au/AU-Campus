import { createHash, randomBytes } from "node:crypto";

/** 24 random bytes, URL-safe. Shown once to staff; only the hash is stored. */
export function newLineupToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Hash used for lookup. Must match `encode(sha256(token), 'hex')` in the SQL RPCs. */
export function hashLineupToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function looksLikeLineupToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{20,64}$/.test(token);
}
