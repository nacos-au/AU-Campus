import type { SportId } from "@/lib/utils/sport";
import type { StandingRow } from "@/lib/types/database";
import { TeamCrest } from "@/components/ui/team-crest";
import { logoForSport, playerAvatarForId } from "@/lib/utils/sport-assets";
import Link from "next/link";

interface Column {
  key: string;
  label: string;
  align?: "left" | "center";
  render?: (row: StandingRow, index: number) => React.ReactNode;
}

function footballColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => i + 1 },
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
}

function basketballColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => i + 1 },
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
}

function tennisColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => i + 1 },
    { key: "team", label: "Player / Club", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "P", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
}

function trackColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => i + 1 },
    { key: "team", label: "Athlete", render: (row) => <AthleteCell row={row} sport={sport} /> },
    { key: "played", label: "Events", align: "center", render: (r) => r.played },
    { key: "won", label: "Gold", align: "center", render: (r) => r.won },
    { key: "drawn", label: "Silver", align: "center", render: (r) => r.drawn },
    { key: "lost", label: "Bronze", align: "center", render: (r) => r.lost },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
}

function volleyballColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", render: (_, i) => i + 1 },
    { key: "team", label: "Team", render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "Pl", align: "center", render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", render: (r) => <strong>{r.points}</strong> },
  ];
}

function columnsForSport(sport: SportId): Column[] {
  switch (sport) {
    case "basketball":
      return basketballColumns(sport);
    case "tennis":
      return tennisColumns(sport);
    case "track":
      return trackColumns(sport);
    case "volleyball":
      return volleyballColumns(sport);
    default:
      return footballColumns(sport);
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
  return (
    <Link href={`/players/${row.team_id}?sport=${sport}`} className="flex items-center gap-2.5 hover:underline">
      <TeamCrest code={row.short_code} logoUrl={row.logo_url ?? playerAvatarForId(row.team_id)} alt={row.team_name} size="sm" />
      <span className="font-display text-sm font-bold sm:text-base">{row.team_name}</span>
    </Link>
  );
}

export function StandingsTable({
  rows,
  sport = "football",
  highlightTeamId,
}: {
  rows: StandingRow[];
  sport?: SportId;
  highlightTeamId?: string;
}) {
  const columns = columnsForSport(sport);

  return (
    <div className="table-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-rule bg-white font-display text-xs font-extrabold uppercase">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-4 pr-3 first:pl-5 ${col.align === "center" ? "text-center" : "text-left"}`}
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
                  className={`border-b border-rule py-4 pr-3 first:pl-5 font-medium ${
                    col.align === "center" ? "text-center" : ""
                  } ${col.key === "pos" ? "font-display font-extrabold" : ""}`}
                >
                  {col.render?.(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
