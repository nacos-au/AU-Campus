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
  mobile?: boolean;
  render?: (row: StandingRow, index: number) => React.ReactNode;
}

function nextMatchColumn(sport: SportId): Column {
  return {
    key: "next",
    label: "Next",
    align: "center",
    mobile: true,
    render: (row) => <NextMatchCell row={row} sport={sport} />,
  };
}

function footballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", mobile: true, render: (_, i) => i + 1 },
    { key: "team", label: "Team", mobile: true, render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "Pl", align: "center", mobile: true, render: (r) => r.played },
    { key: "won", label: "W", align: "center", render: (r) => r.won },
    { key: "drawn", label: "D", align: "center", render: (r) => r.drawn },
    { key: "lost", label: "L", align: "center", render: (r) => r.lost },
    { key: "gf", label: "GF", align: "center", render: (r) => r.goals_for },
    { key: "ga", label: "GA", align: "center", render: (r) => r.goals_against },
    {
      key: "gd",
      label: "GD",
      align: "center",
      mobile: true,
      render: (r) => (r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference),
    },
    { key: "pts", label: "Pts", align: "center", mobile: true, render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function basketballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", mobile: true, render: (_, i) => i + 1 },
    { key: "team", label: "Team", mobile: true, render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "P", align: "center", mobile: true, render: (r) => r.played },
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
    { key: "pts", label: "Pts", align: "center", mobile: true, render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function tennisColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", mobile: true, render: (_, i) => i + 1 },
    { key: "team", label: "Player / Club", mobile: true, render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "P", align: "center", mobile: true, render: (r) => r.played },
    { key: "won", label: "W", align: "center", mobile: true, render: (r) => r.won },
    { key: "lost", label: "L", align: "center", mobile: true, render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", mobile: true, render: (r) => <strong>{r.points}</strong> },
  ];
  if (showNextMatch) cols.push(nextMatchColumn(sport));
  return cols;
}

function trackColumns(sport: SportId): Column[] {
  return [
    { key: "pos", label: "Pos", mobile: true, render: (_, i) => i + 1 },
    { key: "team", label: "Athlete", mobile: true, render: (row) => <AthleteCell row={row} sport={sport} /> },
    { key: "played", label: "Events", align: "center", mobile: true, render: (r) => r.played },
    { key: "won", label: "Gold", align: "center", mobile: true, render: (r) => r.won },
    { key: "drawn", label: "Silver", align: "center", render: (r) => r.drawn },
    { key: "lost", label: "Bronze", align: "center", render: (r) => r.lost },
    { key: "pts", label: "Pts", align: "center", mobile: true, render: (r) => <strong>{r.points}</strong> },
  ];
}

function volleyballColumns(sport: SportId, showNextMatch: boolean): Column[] {
  const cols: Column[] = [
    { key: "pos", label: "Pos", mobile: true, render: (_, i) => i + 1 },
    { key: "team", label: "Team", mobile: true, render: (row) => <TeamCell row={row} sport={sport} /> },
    { key: "played", label: "Pl", align: "center", mobile: true, render: (r) => r.played },
    { key: "won", label: "W", align: "center", mobile: true, render: (r) => r.won },
    { key: "lost", label: "L", align: "center", mobile: true, render: (r) => r.lost },
    { key: "setsW", label: "Sets+", align: "center", render: (r) => r.goals_for },
    { key: "setsL", label: "Sets-", align: "center", render: (r) => r.goals_against },
    { key: "pts", label: "Pts", align: "center", mobile: true, render: (r) => <strong>{r.points}</strong> },
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
  if (!next) return <span className="text-xs opacity-30">—</span>;
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

function FormStrip({ form }: { form: StandingRow["form"] }) {
  if (!form.length) return null;
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
            r === "W" && "bg-accent/10 text-accent",
            r === "D" && "bg-surface text-ink/60",
            r === "L" && "bg-red-50 text-red-700"
          )}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function MobileStandingCard({
  row,
  index,
  sport,
  columns,
  highlightTeamId,
}: {
  row: StandingRow;
  index: number;
  sport: SportId;
  columns: Column[];
  highlightTeamId?: string;
}) {
  const mobileCols = columns.filter((c) => c.mobile && c.key !== "pos" && c.key !== "team");
  const nextCol = columns.find((c) => c.key === "next");

  return (
    <div
      className={cn(
        "table-card px-4 py-3",
        highlightTeamId === row.team_id && "ring-2 ring-accent/30"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="w-5 shrink-0 text-center font-display text-sm font-extrabold opacity-50">
            {index + 1}
          </span>
          {columns.find((c) => c.key === "team")?.render?.(row, index)}
        </div>
        {nextCol?.render?.(row, index)}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {mobileCols.map((col) => (
          <span key={col.key} className="opacity-70">
            <span className="font-bold uppercase opacity-50">{col.label}</span>{" "}
            {col.render?.(row, index)}
          </span>
        ))}
      </div>
      {row.form.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase opacity-40">Form</span>
          <FormStrip form={row.form} />
        </div>
      )}
    </div>
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
    <>
      {/* Mobile — stacked cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((row, i) => (
          <MobileStandingCard
            key={row.team_id}
            row={row}
            index={i}
            sport={sport}
            columns={columns}
            highlightTeamId={highlightTeamId}
          />
        ))}
      </div>

      {/* Desktop — full table */}
      <div className="table-card hidden overflow-x-auto md:block">
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
    </>
  );
}
