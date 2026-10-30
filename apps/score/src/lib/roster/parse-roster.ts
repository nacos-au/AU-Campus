/**
 * Forgiving list parser for bulk onboarding of teams and players.
 *
 * Accepts whatever a sports secretary is likely to paste: one record per line
 * (or one line separated by `;` / `,`), fields separated by comma, colon,
 * semicolon, pipe, tab, " - ", " · ", ". " or two-or-more spaces. Leading list
 * markers ("1.", "2)", "-", "•") and a header row are ignored.
 */

export interface ParsedTeam {
  line: number;
  raw: string;
  name: string;
  department_code: string | null;
  department_name: string | null;
  /** Code was derived from the first word of the name rather than given. */
  code_inferred: boolean;
  issues: string[];
}

export interface ParsedPlayer {
  line: number;
  raw: string;
  first_name: string;
  last_name: string;
  matric_number: string | null;
  position: string | null;
  jersey_number: number | null;
  /** Team named inline (when the list mixes teams). */
  team_name: string | null;
  issues: string[];
}

export interface ParseResult<T> {
  rows: T[];
  /** Human label for the delimiter that was detected, e.g. "comma". */
  delimiter: string | null;
  skipped_header: boolean;
}

const FIELD_DELIMITERS: Array<{ label: string; re: RegExp; test: RegExp }> = [
  { label: "tab", re: /\t+/, test: /\t/ },
  { label: "pipe", re: /\s*\|\s*/, test: /\|/ },
  { label: "semicolon", re: /\s*;\s*/, test: /;/ },
  { label: "comma", re: /\s*,\s*/, test: /,/ },
  // Colon — but not inside a time like 12:30
  { label: "colon", re: /\s*:\s*/, test: /(?<!\d):|:(?!\d)/ },
  { label: "dot", re: /\s*·\s*/, test: /·/ },
  { label: "dash", re: /\s+[-–—]\s+/, test: /\s[-–—]\s/ },
  // Full stop followed by space — but not after an initial ("J. Doe")
  { label: "full stop", re: /(?<!\b[A-Za-z])\.\s+/, test: /(?<!\b[A-Za-z])\.\s+\S/ },
  { label: "spaces", re: / {2,}/, test: / {2}/ },
];

const LIST_MARKER = /^\s*(?:\d{1,3}\s*[.)\]:-]|[-•*–—>]|\(\d{1,3}\))\s+/;

const HEADER_WORDS = /\b(name|names|team|teams|player|players|matric|position|pos|jersey|number|no\.?|dept|department|code|institution)\b/i;

const POSITIONS = [
  "goalkeeper", "gk", "keeper", "defender", "def", "centre back", "center back", "cb",
  "left back", "lb", "right back", "rb", "full back", "wing back", "midfielder", "mid",
  "cm", "cdm", "cam", "dm", "am", "winger", "lw", "rw", "forward", "fw", "striker", "st",
  "cf", "attacker",
  "guard", "point guard", "pg", "shooting guard", "sg", "small forward", "sf",
  "power forward", "pf", "center", "centre", "c",
  "setter", "libero", "outside hitter", "opposite", "opposite hitter", "middle blocker",
  "singles", "doubles",
  "sprinter", "hurdler", "jumper", "thrower", "distance", "middle distance", "relay",
];

const MATRIC_RE = /^(?=.*\d)[A-Za-z0-9]+(?:[\/-][A-Za-z0-9]+){1,4}$/;
const JERSEY_RE = /^#?\s?(\d{1,3})$/;
const DEPT_CODE_RE = /^[A-Z][A-Z0-9&]{1,6}$/;

function looksLikeDeptCode(s: string): boolean {
  return DEPT_CODE_RE.test(s.toUpperCase()) && s.length <= 7 && !/\s/.test(s);
}

function looksLikePlayerField(s: string): boolean {
  return MATRIC_RE.test(s) || JERSEY_RE.test(s) || Boolean(normalisePosition(s));
}

function looksLikeBareName(s: string): boolean {
  return /^[A-Za-z][A-Za-z'.& -]*$/.test(s) && s.split(/\s+/).length <= 5;
}

/**
 * A single pasted line is treated as many records when it is a *list of names*
 * (or name+code pairs). "CSC FC, CSC, Computer Science" stays one record —
 * that's fields of a single team.
 */
function splitSingleLine(raw: string): string[] | null {
  if (/;/.test(raw)) {
    return raw.split(/\s*;\s*/).map((p) => p.trim()).filter(Boolean);
  }

  // "CSC FC. MEC Giants. Law Barristers"
  const dotParts = raw
    .split(/(?<!\b[A-Za-z])\.\s+/)
    .map((p) => p.trim().replace(/\.$/, ""))
    .filter(Boolean);
  if (
    dotParts.length > 1 &&
    !dotParts.some((p) => /[,;|]/.test(p)) &&
    dotParts.every(looksLikeBareName)
  ) {
    return dotParts;
  }

  if (!/,/.test(raw)) return null;

  const parts = raw.split(/\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // One player with fields: "Adaeze Okonkwo, AU/CS/2022/0142, Forward, 9"
  if (parts.some(looksLikePlayerField) && parts.length <= 6) return null;
  // One team with a code/department: "CSC FC, CSC, Computer Science"
  if (parts.some(looksLikeDeptCode) && parts.length <= 4) return null;

  const structured = parts.filter((p) => /[:|]| [-–—] /.test(p)).length;
  if (structured >= Math.max(1, parts.length - 1)) return parts;

  if (parts.every(looksLikeBareName)) return parts;
  return null;
}

export function splitRecords(text: string): Array<{ line: number; raw: string }> {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l, i) => ({ line: i + 1, raw: l.trim() }))
    .filter((l) => l.raw.length > 0);

  if (lines.length === 1) {
    const parts = splitSingleLine(lines[0].raw);
    if (parts && parts.length > 1) {
      return parts.map((raw, i) => ({ line: i + 1, raw }));
    }
  }

  return lines;
}

function stripMarker(raw: string): string {
  return raw.replace(LIST_MARKER, "").trim();
}

export function splitFields(raw: string): { fields: string[]; delimiter: string | null } {
  const cleaned = stripMarker(raw);
  for (const d of FIELD_DELIMITERS) {
    if (d.test.test(cleaned)) {
      const fields = cleaned
        .split(d.re)
        .map((f) => f.trim().replace(/^["']|["']$/g, "").trim())
        .filter((f) => f.length > 0);
      if (fields.length > 1) return { fields, delimiter: d.label };
    }
  }
  return { fields: cleaned ? [cleaned.replace(/\.$/, "")] : [], delimiter: null };
}

function isHeader(fields: string[]): boolean {
  if (fields.length < 2) return false;
  const hits = fields.filter((f) => HEADER_WORDS.test(f) && f.split(/\s+/).length <= 3).length;
  return hits >= Math.ceil(fields.length / 2);
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, pre: string, ch: string) => pre + ch.toUpperCase());
}

function normalisePosition(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!POSITIONS.includes(key)) return null;
  const MAP: Record<string, string> = {
    gk: "Goalkeeper", keeper: "Goalkeeper", def: "Defender", cb: "Defender", lb: "Defender",
    rb: "Defender", "centre back": "Defender", "center back": "Defender", "full back": "Defender",
    "wing back": "Defender", mid: "Midfielder", cm: "Midfielder", cdm: "Midfielder",
    cam: "Midfielder", dm: "Midfielder", am: "Midfielder", fw: "Forward", st: "Forward",
    cf: "Forward", striker: "Forward", attacker: "Forward", winger: "Forward", lw: "Forward",
    rw: "Forward", pg: "Guard", sg: "Guard", "point guard": "Guard", "shooting guard": "Guard",
    sf: "Forward", pf: "Forward", "small forward": "Forward", "power forward": "Forward",
    c: "Center", centre: "Center",
  };
  return MAP[key] ?? titleCase(key);
}

/* ────────────────────────────── Teams ────────────────────────────── */

export function parseTeams(text: string): ParseResult<ParsedTeam> {
  const records = splitRecords(text);
  const rows: ParsedTeam[] = [];
  let delimiter: string | null = null;
  let skippedHeader = false;
  const seen = new Map<string, number>();

  records.forEach((rec, idx) => {
    const { fields, delimiter: d } = splitFields(rec.raw);
    if (!fields.length) return;
    if (idx === 0 && isHeader(fields)) {
      skippedHeader = true;
      return;
    }
    if (d && !delimiter) delimiter = d;

    const issues: string[] = [];
    let name = fields[0];
    let code: string | null = null;
    let deptName: string | null = null;
    let inferred = false;

    // "CSC FC (CSC)" / "CSC FC [Computer Science]"
    const paren = name.match(/^(.*?)\s*[([]\s*([^)\]]+)\s*[)\]]\s*$/);
    if (paren) {
      name = paren[1].trim();
      const inner = paren[2].trim();
      if (DEPT_CODE_RE.test(inner.toUpperCase()) && inner.length <= 7) code = inner.toUpperCase();
      else deptName = inner;
    }

    for (const f of fields.slice(1)) {
      if (!code && DEPT_CODE_RE.test(f.toUpperCase()) && f.length <= 7 && !/\s/.test(f)) {
        code = f.toUpperCase();
      } else if (!deptName) {
        deptName = f;
      } else {
        issues.push(`Extra field ignored: “${f}”`);
      }
    }

    if (!code) {
      const first = name.split(/\s+/)[0] ?? "";
      if (/^[A-Z][A-Z0-9&]{1,5}$/.test(first) || /^[A-Za-z]{2,4}$/.test(first)) {
        code = first.toUpperCase();
        inferred = true;
      } else if (deptName) {
        code = deptName
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 6);
        inferred = true;
      }
    }

    if (!name) issues.push("Missing team name");
    if (!code) issues.push("No department code — add one like “CSC” or a department name");

    const key = name.toLowerCase();
    if (seen.has(key)) issues.push(`Duplicate of line ${seen.get(key)}`);
    else seen.set(key, rec.line);

    rows.push({
      line: rec.line,
      raw: rec.raw,
      name,
      department_code: code,
      department_name: deptName,
      code_inferred: inferred,
      issues,
    });
  });

  return { rows, delimiter, skipped_header: skippedHeader };
}

/* ───────────────────────────── Players ───────────────────────────── */

export interface ParsePlayersOptions {
  /** Known team names — lets an inline team column be recognised. */
  knownTeams?: string[];
}

export function parsePlayers(text: string, opts: ParsePlayersOptions = {}): ParseResult<ParsedPlayer> {
  const records = splitRecords(text);
  const rows: ParsedPlayer[] = [];
  let delimiter: string | null = null;
  let skippedHeader = false;
  const known = (opts.knownTeams ?? []).map((t) => t.toLowerCase());
  const seen = new Map<string, number>();

  records.forEach((rec, idx) => {
    const { fields, delimiter: d } = splitFields(rec.raw);
    if (!fields.length) return;
    if (idx === 0 && isHeader(fields)) {
      skippedHeader = true;
      return;
    }
    if (d && !delimiter) delimiter = d;

    const issues: string[] = [];
    let matric: string | null = null;
    let position: string | null = null;
    let jersey: number | null = null;
    let team: string | null = null;

    // Name is the first field that isn't obviously something else.
    const rest = [...fields];
    let nameIdx = rest.findIndex(
      (f) => !JERSEY_RE.test(f) && !MATRIC_RE.test(f) && !normalisePosition(f)
    );
    if (nameIdx < 0) nameIdx = 0;
    const fullName = rest.splice(nameIdx, 1)[0] ?? "";

    for (const f of rest) {
      const j = f.match(JERSEY_RE);
      if (j && jersey === null) {
        jersey = Number(j[1]);
        continue;
      }
      if (MATRIC_RE.test(f) && !matric) {
        matric = f.toUpperCase();
        continue;
      }
      const pos = normalisePosition(f);
      if (pos && !position) {
        position = pos;
        continue;
      }
      if (known.includes(f.toLowerCase()) && !team) {
        team = f;
        continue;
      }
      if (!position && !/\d/.test(f) && f.split(/\s+/).length <= 2) {
        position = titleCase(f);
        continue;
      }
      if (!team) {
        team = f;
        continue;
      }
      issues.push(`Extra field ignored: “${f}”`);
    }

    const nameParts = fullName.replace(/\s+/g, " ").trim().split(" ");
    let first = "";
    let last = "";
    if (nameParts.length === 1) {
      first = titleCase(nameParts[0]);
      issues.push("Only one name given — surname missing");
    } else {
      last = titleCase(nameParts[nameParts.length - 1]);
      first = nameParts.slice(0, -1).map(titleCase).join(" ");
    }
    if (!fullName) issues.push("Missing player name");

    const key = `${first} ${last}`.toLowerCase();
    if (seen.has(key)) issues.push(`Duplicate of line ${seen.get(key)}`);
    else seen.set(key, rec.line);

    rows.push({
      line: rec.line,
      raw: rec.raw,
      first_name: first,
      last_name: last,
      matric_number: matric,
      position,
      jersey_number: jersey,
      team_name: team,
      issues,
    });
  });

  return { rows, delimiter, skipped_header: skippedHeader };
}

/** Window event fired after a successful roster import so sibling tools (e.g. the competition wizard) can refetch teams. */
export const ROSTER_UPDATED_EVENT = "au-score:roster-updated";

export const ROSTER_FORMAT_HINTS = {
  teams: [
    "CSC FC, CSC, Computer Science",
    "MEC Giants : MEC",
    "Law Barristers (LAW)",
    "Bio Wolves",
  ],
  players: [
    "Adaeze Okonkwo, AU/CS/2022/0142, Forward, 9",
    "Chidi Eze : Midfielder : 4",
    "Ngozi Adeyemi - GK - #1",
    "Tunde Bakare",
  ],
} as const;
