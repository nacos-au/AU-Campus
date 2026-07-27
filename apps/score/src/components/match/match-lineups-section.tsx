import { FootballLineupPitch } from "@/components/match/football-lineup-pitch";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { getPitchLineup, getSubmittedLineup, resolveLineupPlayers } from "@/lib/data/demo-lineups";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import { getManOfTheMatch } from "@/lib/match/match-meta";
import type { Match } from "@/lib/types/database";
import { dbIdToSport } from "@/lib/utils/sport";

export function MatchLineupsSection({
  match,
  events = [],
}: {
  match: Match;
  events?: DemoMatchEvent[];
}) {
  const sport = dbIdToSport(match.sport_id);
  const motm = match.status === "completed" ? getManOfTheMatch(match.id) : null;

  if (sport === "football") {
    const hasPitch = Boolean(
      (match.home_team_id && getPitchLineup(match.id, match.home_team_id)) ||
        (match.away_team_id && getPitchLineup(match.id, match.away_team_id))
    );

    if (hasPitch) {
      return (
        <section>
          <h2 className="mb-4 font-display text-xl font-extrabold">Lineups</h2>
          <FootballLineupPitch
            match={match}
            events={events}
            sport={sport}
            motmPlayerId={motm?.player_id ?? null}
          />
        </section>
      );
    }
  }

  const sides = [
    { team: match.home_team, teamId: match.home_team_id },
    { team: match.away_team, teamId: match.away_team_id },
  ];

  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-extrabold">Lineups</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {sides.map(({ team, teamId }) => {
          const lineup = teamId ? getSubmittedLineup(match.id, teamId) : null;
          const code = team?.department?.short_code ?? "AU";

          return (
            <div key={teamId ?? code} className="table-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
                <TeamCrest code={code} logoUrl={team?.logo_url} alt={team?.name} size="sm" />
                <p className="font-display text-sm font-extrabold">{team?.name ?? "Team"}</p>
              </div>

              {lineup ? (
                <ul className="divide-y divide-rule">
                  {resolveLineupPlayers(lineup).map((p) => (
                    <li key={p.id} className="flex items-center gap-2.5 px-4 py-2">
                      <PlayerAvatar
                        firstName={p.first_name}
                        lastName={p.last_name}
                        avatarUrl={p.avatar_url}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {p.first_name} {p.last_name}
                      </span>
                      <span className="text-[10px] font-bold uppercase opacity-50">
                        {p.lineup_role ?? p.position ?? ""}
                        {!p.is_starting && " · sub"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm opacity-60">
                  Lineup not available — not submitted by club.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
