/**
 * Pure helpers for the admin fixture rescheduler.
 *
 * Dependency-free on purpose: the editor (client) and the reschedule API
 * (server) both run the same rules, and the unit tests run under plain node.
 *
 * All wall-clock handling is Africa/Lagos (WAT = UTC+1, no DST), matching
 * `lib/match/matchweek.ts`. Because there is no DST, "+N days" is exactly
 * N x 24h.
 */

const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type FixtureKind = "match" | "bracket";

/** One movable fixture, league match or knockout slot. */
export type ScheduleRow = {
  /** `${kind}:${id}` — unique across both tables. */
  key: string;
  kind: FixtureKind;
  id: string;
  title: string;
  /** e.g. "Matchday 13" or "Quarter-finals". */
  phase: string | null;
  status: string;
  scheduled_at: string | null;
  venue_id: string | null;
  venue_name: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  /** First date this fixture ever had, when it has been moved. */
  original_scheduled_at: string | null;
  reschedule_count: number;
};

export type PlannedChange = {
  key: string;
  kind: FixtureKind;
  id: string;
  title: string;
  from: string | null;
  to: string;
};

export type PlanWarning = {
  key: string;
  level: "error" | "warn";
  message: string;
};

export type SchedulePlan = {
  changes: PlannedChange[];
  warnings: PlanWarning[];
  /** True when nothing blocks applying. */
  canApply: boolean;
};

export function rowKey(kind: FixtureKind, id: string): string {
  return `${kind}:${id}`;
}

/** Statuses that can never be moved (the fixture has started or ended). */
export function isLockedStatus(kind: FixtureKind, status: string): boolean {
  if (kind === "match") return !(status === "scheduled" || status === "postponed");
  return status === "live" || status === "completed";
}

export function isValidIso(iso: string | null | undefined): iso is string {
  return typeof iso === "string" && !Number.isNaN(new Date(iso).getTime());
}

/** Add whole days and/or hours to an ISO timestamp. Null stays null. */
export function shiftIso(
  iso: string | null,
  days: number,
  hours = 0
): string | null {
  if (!isValidIso(iso)) return null;
  const ms = new Date(iso).getTime() + days * DAY_MS + hours * HOUR_MS;
  return new Date(ms).toISOString();
}

/** ISO -> value for `<input type="datetime-local">`, shown in WAT. */
export function isoToWatInput(iso: string | null): string {
  if (!isValidIso(iso)) return "";
  return new Date(new Date(iso).getTime() + WAT_OFFSET_MS).toISOString().slice(0, 16);
}

/** `<input type="datetime-local">` value (interpreted as WAT) -> ISO. */
export function watInputToIso(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, mi, 0) - WAT_OFFSET_MS;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const WAT_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const WAT_FORMAT_WITH_YEAR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "Sat 14 Nov, 16:00" in WAT. */
export function formatWat(iso: string | null, withYear = false): string {
  if (!isValidIso(iso)) return "No date";
  const f = withYear ? WAT_FORMAT_WITH_YEAR : WAT_FORMAT;
  return f.format(new Date(iso)).replace(/,/g, "").replace(/\s*(\d{2}:\d{2})$/, ", $1");
}

/** yyyy-MM-dd in WAT, used to group a team's fixtures by calendar day. */
export function watDayKey(iso: string): string {
  return new Date(new Date(iso).getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Turn "matchday_13" / "quarter_final" into "Matchday 13" / "Quarter final". */
export function humanizePhase(phase: string | null | undefined): string | null {
  const raw = phase?.trim();
  if (!raw) return null;
  const spaced = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Build the edit map for "shift these rows by N days (+ H hours)".
 * Rows without a date, or locked rows, are skipped and reported back.
 */
export function buildShiftEdits(
  rows: ScheduleRow[],
  selectedKeys: Iterable<string>,
  days: number,
  hours = 0
): { edits: Record<string, string>; skipped: string[] } {
  const selected = new Set(selectedKeys);
  const edits: Record<string, string> = {};
  const skipped: string[] = [];
  for (const row of rows) {
    if (!selected.has(row.key)) continue;
    if (isLockedStatus(row.kind, row.status)) {
      skipped.push(row.key);
      continue;
    }
    const next = shiftIso(row.scheduled_at, days, hours);
    if (!next) {
      skipped.push(row.key);
      continue;
    }
    edits[row.key] = next;
  }
  return { edits, skipped };
}

/**
 * Turn a map of `key -> new ISO` into a validated plan: only rows that really
 * change are returned, and anything that would be a problem is flagged.
 *
 * `error` warnings block applying; `warn` ones are advisory.
 */
export function planReschedule(
  rows: ScheduleRow[],
  edits: Record<string, string>,
  now: Date = new Date()
): SchedulePlan {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const changes: PlannedChange[] = [];
  const warnings: PlanWarning[] = [];

  // Final schedule = current dates with the edits laid on top.
  const finalAt = new Map<string, string | null>();
  for (const row of rows) finalAt.set(row.key, row.scheduled_at);

  for (const [key, to] of Object.entries(edits)) {
    const row = byKey.get(key);
    if (!row) {
      warnings.push({ key, level: "error", message: "This fixture is not part of the competition." });
      continue;
    }
    if (!isValidIso(to)) {
      warnings.push({ key, level: "error", message: `${row.title}: that date is not valid.` });
      continue;
    }
    if (isLockedStatus(row.kind, row.status)) {
      warnings.push({
        key,
        level: "error",
        message: `${row.title} is ${row.status} and cannot be moved.`,
      });
      continue;
    }
    const unchanged =
      isValidIso(row.scheduled_at) &&
      new Date(row.scheduled_at).getTime() === new Date(to).getTime() &&
      row.status !== "postponed";
    if (unchanged) continue;

    finalAt.set(key, to);
    changes.push({
      key,
      kind: row.kind,
      id: row.id,
      title: row.title,
      from: row.scheduled_at,
      to: new Date(to).toISOString(),
    });
  }

  const changedKeys = new Set(changes.map((c) => c.key));

  for (const c of changes) {
    if (new Date(c.to).getTime() < now.getTime()) {
      warnings.push({
        key: c.key,
        level: "warn",
        message: `${c.title} is being moved to a date in the past (${formatWat(c.to)}).`,
      });
    }
  }

  // Clashes: same venue + same minute, or the same team twice on one WAT day.
  const venueSlots = new Map<string, string[]>();
  const teamDays = new Map<string, string[]>();
  for (const row of rows) {
    const at = finalAt.get(row.key);
    if (!isValidIso(at)) continue;
    if (row.venue_id) {
      const slot = `${row.venue_id}|${Math.floor(new Date(at).getTime() / 60000)}`;
      venueSlots.set(slot, [...(venueSlots.get(slot) ?? []), row.key]);
    }
    for (const teamId of [row.home_team_id, row.away_team_id]) {
      if (!teamId) continue;
      const day = `${teamId}|${watDayKey(at)}`;
      teamDays.set(day, [...(teamDays.get(day) ?? []), row.key]);
    }
  }

  const reported = new Set<string>();
  function report(keys: string[], build: (titles: string) => string) {
    if (keys.length < 2 || !keys.some((k) => changedKeys.has(k))) return;
    const id = [...keys].sort().join("+");
    if (reported.has(id)) return;
    reported.add(id);
    const titles = keys.map((k) => byKey.get(k)?.title ?? k).join(" and ");
    for (const k of keys) {
      if (changedKeys.has(k)) {
        warnings.push({ key: k, level: "warn", message: build(titles) });
      }
    }
  }
  for (const keys of venueSlots.values()) {
    report(keys, (t) => `Same venue and kick-off time: ${t}.`);
  }
  for (const keys of teamDays.values()) {
    report(keys, (t) => `A team would play twice on the same day: ${t}.`);
  }

  return {
    changes,
    warnings,
    canApply: changes.length > 0 && !warnings.some((w) => w.level === "error"),
  };
}

/** Keys of `row` and every later row (by date) that can still be moved. */
export function selectFromHere(rows: ScheduleRow[], fromKey: string): string[] {
  const sorted = sortRowsByDate(rows);
  const start = sorted.findIndex((r) => r.key === fromKey);
  if (start < 0) return [];
  return sorted
    .slice(start)
    .filter((r) => !isLockedStatus(r.kind, r.status))
    .map((r) => r.key);
}

/** Sunday-to-Saturday week (WAT) containing `iso`, as a stable key. */
export function watWeekKey(iso: string): string {
  const wat = new Date(new Date(iso).getTime() + WAT_OFFSET_MS);
  const sunday = new Date(
    Date.UTC(wat.getUTCFullYear(), wat.getUTCMonth(), wat.getUTCDate()) -
      wat.getUTCDay() * DAY_MS
  );
  return sunday.toISOString().slice(0, 10);
}

/** Movable rows that fall in the same Sun-Sat week as `weekOfKey`. */
export function selectSameWeek(rows: ScheduleRow[], weekOfKey: string): string[] {
  const anchor = rows.find((r) => r.key === weekOfKey);
  if (!anchor || !isValidIso(anchor.scheduled_at)) return [];
  const week = watWeekKey(anchor.scheduled_at);
  return rows
    .filter(
      (r) =>
        isValidIso(r.scheduled_at) &&
        watWeekKey(r.scheduled_at) === week &&
        !isLockedStatus(r.kind, r.status)
    )
    .map((r) => r.key);
}

/** Dated rows first (ascending), undated knockout slots last. */
export function sortRowsByDate<T extends { scheduled_at: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = isValidIso(a.scheduled_at) ? new Date(a.scheduled_at).getTime() : Infinity;
    const tb = isValidIso(b.scheduled_at) ? new Date(b.scheduled_at).getTime() : Infinity;
    return ta - tb;
  });
}
