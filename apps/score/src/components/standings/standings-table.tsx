import Link from "next/link";
import type { StandingRow } from "@/lib/types/database";
import type { SportId } from "@/lib/utils/sport";
import { TeamCrest, PlayerAvatar } from "@/components/ui/team-crest";
import { logoForSport, playerAvatarForId } from "@/lib/utils/sport-assets";
import { cn } from "@/lib/utils/cn";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center";
  render?: (row: StandingRow, index: number) => React.ReactNode;
}

function isStatColumn(key: string): boolean {
  return key !== "pos" && key !== "team";
}

function nextMatchColumn(sport: SportId): Column {
  return {
    key: "next",
    label: "Next",
    align: "center",
    render: (row) => <NextMatchCell row={row} sport={sport} />,
  };
}

function footballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", render: (_, i) => String(i + 1).padStart(2, "0") },
    { key: "team", label: "Team", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "Pl", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "drawn", label: "D", align: "center", render: (r) => r.drawn },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "gf", label: "GF", align: "center", render: (r) => r.goals_for },
    { key: "ga", label: "GA", align: "center", render: (r) => r.goals_against },
    {
      key: "gd",
      label: "GD",
      align: "center",
      render: (r) => (r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference),
    },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function basketballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", render: (_, i) => String(i + 1).padStart(2, "0") },
    { key: "team", label: "Team", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "P", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    {
      key: "pct",
      label: "PCT",
      align: "center",
      render: (r) => (r.played ? (r.won / r.played).toFixed(3).slice(1) : ".000"),
    },
    { key: "pf", label: "PF", align: "center", render: (r) => r.goals_for },
    { key: "pa", label: "PA", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function tennisColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", render: (_, i) => String(i + 1).padStart(2, "0") },
    { key: "team", label: "Player / Club", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "P", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function trackColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => String(i + 1).padStart(2, "0") },
    { key: "team", label: "Athlete", render: (row) => <AthleteCell row={row} sport={sport} /> },
    { key: "played", label: "Events", align: "center", render: (r) => r.played },
    { key: "won", label: "Gold", align: "center", render: (r) => r.won },
    { key: "drawn", label: "Silver", align: "center", render: (r) => r.drawn },
    { key: "lost", label: "Bronze", align: "center", render: (r) => r.lost },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
}

function volleyballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", render: (_, i) => String(i + 1).padStart(2, "0") },
    { key: "team", label: "Team", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "Pl", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function columnsForSport(sport: SportId, showNextMatch: boolean): Column[] {
  switch (sport) {
    case "basketball":
      return basketballColumns(sport, showNextMatch);
    case "tennis":
      return tennisColumns(sport, showNextMatch);
    case "track":
      return trackColumns(sport);
    case "volleyball":
      return volleyballColumns(sport, showNextMatch);
    default:
      return footballColumns(sport, showNextMatch);
  }
}

function TeamCell({ row, sport }: { row: StandingRow; sport: SportId }) {
  return (
    <Link href={`/teams/${row.team_id}?sport=${sport}`} className="flex items-center gap-2.5 hover:underline">
      <TeamCrest code={row.short_code} logoUrl={row.logo_url ?? logoForSport(sport)} alt={row.team_name} size="sm" />
      <span className="font-display text-sm font-bold sm:text-base">{row.team_name}</span>
    </Link>
  );
}

function AthleteCell({ row, sport }: { row: StandingRow; sport: SportId }) {
  const [firstName, ...rest] = row.team_name.split(" ");
  const lastName = rest.join(" ");
  return (
    <Link href={`/players/${row.team_id}?sport=${sport}`} className="flex items-center gap-2.5 hover:underline">
      <PlayerAvatar
        firstName={firstName}
        lastName={lastName}
        avatarUrl={row.logo_url ?? playerAvatarForId(row.team_id)}
        size="sm"
      />
      <span className="font-display text-sm font-bold sm:text-base">{row.team_name}</span>
    </Link>
  );
}

function NextMatchCell({ row, sport }: { row: StandingRow; sport: SportId }) {
  const next = row.next_match;
  if (!next) return <span className="text-[12px] opacity-30">—</span>;
  return (
    <Link
      href={`/teams/${next.opponent_team_id}?sport=${sport}`}
      className="inline-flex flex-col items-center gap-0.5 hover:opacity-80"
      title={`Next: ${next.opponent_name}`}
    >
      <TeamCrest
        code={next.short_code}
        logoUrl={next.logo_url ?? logoForSport(sport)}
        alt={next.opponent_name}
        size="sm"
      />
      <span className="max-w-[52px] truncate text-[10px] font-semibold opacity-60">{next.short_code}</span>
    </Link>
  );
}

export function StandingsTable({
  rows,
  sport = "football",
  highlightTeamId,
  showNextMatch = false,
}: {
  rows: StandingRow[];
  sport?: SportId;
  highlightTeamId?: string;
  /** Team sports with scheduled fixtures — shows opponent crest in Next column */
  showNextMatch?: boolean;
}) {
  const columns = columnsForSport(sport, showNextMatch);

  return (
    <div className="table-card overflow-hidden">
      <div className="table-scroll-x">
        <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-rule bg-white font-display text-xs font-extrabold uppercase">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap py-3 pr-3 first:pl-4 sm:py-4 sm:first:pl-5",
                  col.align === "center" ? "text-center" : "text-left",
                  isStatColumn(col.key) ? "text-[12px] font-bold normal-case opacity-60" : ""
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.team_id}
              className={highlightTeamId === row.team_id ? "bg-wrapper/60" : ""}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap border-b border-rule py-3 pr-3 first:pl-4 sm:py-4 sm:first:pl-5",
                    col.align === "center" ? "text-center" : "",
                    col.key === "pos" && "font-display text-sm font-extrabold tabular-nums",
                    col.key === "team" && "min-w-[140px] font-medium",
                    isStatColumn(col.key) && "text-[12px] font-medium tabular-nums"
                  )}
                >
                  {col.render?.(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
