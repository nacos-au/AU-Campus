import type { Match } from "@/lib/types/database";
import { getTennisLineupForMatch } from "@/lib/data/demo-squads";

export function TennisLineupBanner({ match }: { match: Match }) {
  const variant = match.match_variant === "doubles" ? "doubles" : "singles";
  const home = getTennisLineupForMatch(match.home_team_id ?? "", variant);
  const away = getTennisLineupForMatch(match.away_team_id ?? "", variant);

  const formatLineup = (players: typeof home) =>
    players.map((p) => `${p.first_name} ${p.last_name}`).join(" / ") || "TBD";

  return (
    <p className="mb-4 text-center text-sm opacity-80">
      <span className="font-display font-bold uppercase text-accent">{variant}</span>
      {" · "}
      {formatLineup(home)} vs {formatLineup(away)}
    </p>
  );
}
