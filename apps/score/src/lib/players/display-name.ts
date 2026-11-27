export type NameMode = "legal" | "nickname";

export const NAME_MODE_STORAGE_KEY = "score-player-name-mode";

export interface NameParts {
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
}

export function legalName(p: NameParts): string {
  return [p.first_name, p.last_name]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

export function legalShortName(p: NameParts): string {
  const f = (p.first_name ?? "").trim();
  const l = (p.last_name ?? "").trim();
  if (!f && !l) return "";
  if (!l) return f;
  if (!f) return l;
  return `${f[0]}. ${l}`;
}

export function hasNickname(p: NameParts): boolean {
  return Boolean((p.nickname ?? "").trim());
}

/**
 * Name to show for a player. Nickname mode falls back to the legal name when
 * the player has no nickname, so a missing nickname never shows a blank.
 */
export function playerDisplayName(
  p: NameParts,
  mode: NameMode,
  opts?: { short?: boolean }
): string {
  if (mode === "nickname" && hasNickname(p)) return (p.nickname ?? "").trim();
  return opts?.short ? legalShortName(p) : legalName(p);
}

export function parseNameMode(raw: string | null | undefined): NameMode {
  return raw === "nickname" ? "nickname" : "legal";
}

export function nextNameMode(mode: NameMode): NameMode {
  return mode === "legal" ? "nickname" : "legal";
}
