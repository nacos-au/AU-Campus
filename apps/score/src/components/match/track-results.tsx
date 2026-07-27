import Link from "next/link";
import type { TrackResult } from "@/lib/types/database";
import { PlayerAvatar } from "@/components/ui/team-crest";
import { cn } from "@/lib/utils/cn";

export function TrackResultsTable({
  results,
  sport,
}: {
  results: TrackResult[];
  sport: string;
}) {
  if (results.length === 0) return null;

  return (
    <div className="table-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule bg-surface text-left text-xs font-bold uppercase tracking-wide opacity-60">
            <th className="px-5 py-3">Pos</th>
            <th className="px-5 py-3">Athlete</th>
            <th className="px-5 py-3 text-center">Lane</th>
            <th className="px-5 py-3 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => {
            const [firstName, ...rest] = row.athlete_name.split(" ");
            const lastName = rest.join(" ");
            const isDnf = row.status === "dnf" || row.time_display === "DNF";
            const isDsq = row.status === "false_start" || row.time_display === "DSQ";
            return (
              <tr key={`${row.player_id}-${row.lane}`} className="border-b border-rule last:border-0">
                <td className="px-5 py-3 font-display font-extrabold tabular-nums">
                  {row.rank > 0 ? row.rank : "—"}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/players/${row.player_id}?sport=${sport}`}
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <PlayerAvatar
                      firstName={firstName}
                      lastName={lastName}
                      avatarUrl={row.avatar_url}
                      size="sm"
                    />
                    <div>
                      <p className="font-display font-bold">{row.athlete_name}</p>
                      <p className="text-xs opacity-60">{row.department_code}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3 text-center tabular-nums">{row.lane}</td>
                <td
                  className={cn(
                    "px-5 py-3 text-right font-display font-extrabold tabular-nums",
                    (isDnf || isDsq) && "text-red-600"
                  )}
                >
                  {isDnf ? "DNF" : isDsq ? "DSQ" : `${row.time_display}${row.time_display.includes("s") ? "" : "s"}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
