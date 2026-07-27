import type { PeriodScore, SetScore } from "@/lib/types/database";

export function PeriodScoresTable({
  scores,
  homeLabel,
  awayLabel,
}: {
  scores: PeriodScore[];
  homeLabel: string;
  awayLabel: string;
}) {
  if (scores.length === 0) return null;

  return (
    <div className="table-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule bg-surface text-left text-xs font-bold uppercase tracking-wide opacity-60">
            <th className="px-5 py-3">Period</th>
            <th className="px-5 py-3 text-center">{homeLabel}</th>
            <th className="px-5 py-3 text-center">{awayLabel}</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((row) => (
            <tr key={row.period} className="border-b border-rule last:border-0">
              <td className="px-5 py-3 font-display font-semibold">{row.label}</td>
              <td className="px-5 py-3 text-center tabular-nums">{row.home_score}</td>
              <td className="px-5 py-3 text-center tabular-nums">{row.away_score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SetScoresTable({
  scores,
  homeLabel,
  awayLabel,
}: {
  scores: SetScore[];
  homeLabel: string;
  awayLabel: string;
}) {
  if (scores.length === 0) return null;

  return (
    <div className="table-card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-rule bg-surface text-left text-xs font-bold uppercase tracking-wide opacity-60">
            <th className="px-5 py-3">Set</th>
            <th className="px-5 py-3 text-center">{homeLabel}</th>
            <th className="px-5 py-3 text-center">{awayLabel}</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((row) => (
            <tr key={row.set_number} className="border-b border-rule last:border-0">
              <td className="px-5 py-3 font-display font-semibold">
                Set {row.set_number}
                {row.tiebreak && <span className="ml-1 text-xs opacity-50">(TB)</span>}
              </td>
              <td className="px-5 py-3 text-center tabular-nums">{row.home_games}</td>
              <td className="px-5 py-3 text-center tabular-nums">{row.away_games}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
