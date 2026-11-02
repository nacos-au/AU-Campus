/**
 * Competition builder — pure logic for creating leagues and cups from a list
 * of registered teams. Used by the admin wizard and by the /api/competitions
 * endpoint, and designed to run identically on demo data or real Supabase rows.
 *
 * Real-world rules encoded here:
 * - A cup bracket needs a power-of-two entry size (2, 4, 8, 16, 32).
 * - If fewer teams register than the entry size, the shortfall becomes byes:
 *   bye teams skip round one and advance automatically. The wizard asks the
 *   admin to confirm before publishing.
 * - The draw can be randomized by the platform, or use a custom order when a
 *   physical/IRL draw already happened.
 * - Leagues generate a round-robin schedule (single or double) — no byes
 *   needed; an odd team count just means one team rests each matchweek.
 */

/** event = registered sides + manually scheduled fixtures (no auto league/cup draw). */
export type CompetitionType = "league" | "cup" | "event";

export type CupEntrySize = 2 | 4 | 8 | 16 | 32;

export interface RegisteredTeam {
  id: string;
  name: string;
  short_code?: string | null;
  logo_url?: string | null;
  /** Seed position for custom (IRL) draws; ignored when randomizing */
  seed?: number;
}

export interface CupConfig {
  entrySize: CupEntrySize;
  /** Optional group stage before the knockout rounds */
  groupStage: boolean;
  groupCount?: number;
  advancePerGroup?: number;
}

export interface LeagueConfig {
  /** true = home & away (double round robin) */
  doubleRoundRobin: boolean;
}

export const ROUND_NAMES: Record<number, { round: string; label: string }> = {
  32: { round: "round_of_32", label: "Round of 32" },
  16: { round: "round_of_16", label: "Round of 16" },
  8: { round: "quarter_final", label: "Quarter-final" },
  4: { round: "semi_final", label: "Semi-final" },
  2: { round: "final", label: "Final" },
};

export interface DrawPairing {
  round: string;
  round_label: string;
  position: number;
  home: RegisteredTeam | null;
  away: RegisteredTeam | null;
  /** Team advancing without playing (opponent slot empty) */
  is_bye: boolean;
}

export interface KnockoutDraw {
  entrySize: CupEntrySize;
  byeCount: number;
  byeTeams: RegisteredTeam[];
  pairings: DrawPairing[];
  /** Placeholder fixtures for later rounds (TBD vs TBD) */
  futureRounds: { round: string; round_label: string; count: number }[];
  warnings: string[];
}

export function nextEntrySize(teamCount: number): CupEntrySize {
  if (teamCount <= 2) return 2;
  if (teamCount <= 4) return 4;
  if (teamCount <= 8) return 8;
  if (teamCount <= 16) return 16;
  return 32;
}

/** Fisher–Yates shuffle; optionally deterministic with a numeric seed for reproducible draws */
export function shuffleTeams<T>(teams: T[], seed?: number): T[] {
  const arr = [...teams];
  let random: () => number;
  if (seed != null) {
    let s = seed >>> 0;
    random = () => {
      // mulberry32 — deterministic PRNG so a published draw can be re-verified
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  } else {
    random = Math.random;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build a knockout draw. Teams beyond the entry size are rejected; fewer teams
 * than the entry size produce byes (spread evenly so bye teams don't meet each
 * other in round one).
 */
export function buildKnockoutDraw(
  teams: RegisteredTeam[],
  options: {
    entrySize?: CupEntrySize;
    randomize: boolean;
    seed?: number;
  }
): KnockoutDraw {
  const warnings: string[] = [];
  const entrySize = options.entrySize ?? nextEntrySize(teams.length);

  if (teams.length < 2) {
    throw new Error("At least 2 teams are required for a cup");
  }
  if (teams.length > entrySize) {
    throw new Error(
      `${teams.length} teams registered but the bracket only has ${entrySize} slots — increase the cup size or remove teams`
    );
  }

  const ordered = options.randomize
    ? shuffleTeams(teams, options.seed)
    : [...teams].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));

  const byeCount = entrySize - ordered.length;
  if (byeCount > 0) {
    warnings.push(
      `${ordered.length} of ${entrySize} slots filled — ${byeCount} team${byeCount === 1 ? "" : "s"} will receive a first-round bye and advance automatically.`
    );
  }

  // Slot list of length entrySize with nulls for byes, spread across the
  // bracket so byes land in different pairings (standard seeding practice).
  const slots: (RegisteredTeam | null)[] = new Array(entrySize).fill(null);
  const pairCount = entrySize / 2;
  let teamIdx = 0;

  // First pass: one team into the home slot of every pairing.
  for (let p = 0; p < pairCount && teamIdx < ordered.length; p++) {
    slots[p * 2] = ordered[teamIdx++];
  }
  // Second pass: fill away slots until teams run out — remaining aways stay
  // null, which is exactly a bye for the home team.
  for (let p = 0; p < pairCount && teamIdx < ordered.length; p++) {
    slots[p * 2 + 1] = ordered[teamIdx++];
  }

  const roundMeta = ROUND_NAMES[entrySize];
  const pairings: DrawPairing[] = [];
  const byeTeams: RegisteredTeam[] = [];

  for (let p = 0; p < pairCount; p++) {
    const home = slots[p * 2];
    const away = slots[p * 2 + 1];
    const isBye = home != null && away == null;
    if (isBye && home) byeTeams.push(home);
    pairings.push({
      round: roundMeta.round,
      round_label: roundMeta.label,
      position: p,
      home,
      away,
      is_bye: isBye,
    });
  }

  // Later rounds as TBD placeholders so the public bracket shows full shape.
  const futureRounds: KnockoutDraw["futureRounds"] = [];
  let size = entrySize / 2;
  while (size >= 2) {
    const meta = ROUND_NAMES[size as CupEntrySize];
    if (meta) futureRounds.push({ round: meta.round, round_label: meta.label, count: size / 2 });
    size = size / 2;
  }

  return { entrySize, byeCount, byeTeams, pairings, futureRounds, warnings };
}

export interface LeagueFixture {
  matchweek: number;
  home: RegisteredTeam;
  away: RegisteredTeam;
}

/**
 * Round-robin schedule via the circle method. Handles odd team counts by
 * inserting a rest slot (no fixture generated against it).
 */
export function buildLeagueSchedule(
  teams: RegisteredTeam[],
  config: LeagueConfig
): { fixtures: LeagueFixture[]; matchweeks: number; warnings: string[] } {
  const warnings: string[] = [];
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required for a league");
  }

  const list: (RegisteredTeam | null)[] = [...teams];
  if (list.length % 2 !== 0) {
    list.push(null);
    warnings.push(
      `Odd number of teams (${teams.length}) — one team sits out each matchweek.`
    );
  }

  const n = list.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: LeagueFixture[] = [];
  const rotation = [...list];

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      if (home && away) {
        // Alternate venue by round so no team is always at home
        const flip = r % 2 === 1;
        fixtures.push({
          matchweek: r + 1,
          home: flip ? away : home,
          away: flip ? home : away,
        });
      }
    }
    // rotate all but the first element
    rotation.splice(1, 0, rotation.pop()!);
  }

  let matchweeks = rounds;
  if (config.doubleRoundRobin) {
    const firstLeg = [...fixtures];
    for (const f of firstLeg) {
      fixtures.push({ matchweek: f.matchweek + rounds, home: f.away, away: f.home });
    }
    matchweeks = rounds * 2;
  }

  return { fixtures, matchweeks, warnings };
}

/** Split registered teams into groups for a cup with a group stage. */
export function buildGroups(
  teams: RegisteredTeam[],
  groupCount: number,
  randomize: boolean,
  seed?: number
): { name: string; teams: RegisteredTeam[] }[] {
  if (groupCount < 1) throw new Error("Need at least one group");
  const ordered = randomize ? shuffleTeams(teams, seed) : [...teams];
  const groups = Array.from({ length: groupCount }, (_, i) => ({
    name: `Group ${String.fromCharCode(65 + i)}`,
    teams: [] as RegisteredTeam[],
  }));
  // Snake distribution keeps group sizes balanced
  ordered.forEach((t, i) => {
    groups[i % groupCount].teams.push(t);
  });
  return groups;
}
