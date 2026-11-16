import { FootballLineupPitch } from "@/components/match/football-lineup-pitch";
import { ShareControls } from "@/components/share/share-controls";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import { buildTeamPitchLineup, type TeamPitchLineup } from "@/lib/data/demo-lineups";
import type { DemoMatchEvent } from "@/lib/data/demo-match-details";
import {
  defaultLineupFromPool,
  fetchMatchLineupsBothSides,
  type PublicMatchLineup,
} from "@/lib/data/match-lineups";
import { getManOfTheMatch } from "@/lib/match/match-meta";
import { lineupStatusLabel } from "@/lib/match/lineup-window";
import type { Match, Player } from "@/lib/types/database";
import { dbIdToSport } from "@/lib/utils/sport";

export async function MatchLineupsSection({
  match,
  events = [],
}: {
  match: Match;
  events?: DemoMatchEvent[];
}) {
  const sport = dbIdToSport(match.sport_id);
  const motm = match.status === "completed" ? getManOfTheMatch(match.id) : null;
  const sheetUrl = match.lineup_image_url?.trim() || null;
  const dbLineups = await fetchMatchLineupsBothSides(
    match.id,
    match.home_team_id,
    match.away_team_id
  );
  const hasDbLineups = Boolean(dbLineups.home || dbLineups.away);
  const sheetStatus =
    dbLineups.home?.status === "confirmed" || dbLineups.away?.status === "confirmed"
      ? "confirmed"
      : dbLineups.home?.status ?? dbLineups.away?.status ?? "predicted";

  if (sheetUrl && match.status !== "completed" && !hasDbLineups) {
    return (
      <section>
        <LineupsHeader
          matchId={match.id}
          subtitle="Official team sheet · published before kick-off"
        />
        <div className="table-card overflow-hidden p-2 sm:p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sheetUrl}
            alt="Pre-match lineup sheet"
            className="mx-auto max-h-[28rem] w-full rounded-xl object-contain"
          />
        </div>
      </section>
    );
  }

  const starterCount = sport === "basketball" ? 5 : sport === "volleyball" ? 6 : 11;
  const [homeDefault, awayDefault] = await Promise.all([
    match.home_team_id
      ? defaultLineupFromPool(
          match.id,
          match.home_team_id,
          match.tournament_id,
          match.sport_id,
          starterCount
        )
      : Promise.resolve(null),
    match.away_team_id
      ? defaultLineupFromPool(
          match.id,
          match.away_team_id,
          match.tournament_id,
          match.sport_id,
          starterCount
        )
      : Promise.resolve(null),
  ]);

  const homeLineup = dbLineups.home ?? homeDefault;
  const awayLineup = dbLineups.away ?? awayDefault;

  if (sport === "football" && (homeLineup || awayLineup)) {
    const { homePitch, awayPitch, playersById } = buildFootballPitchData(
      match,
      homeLineup,
      awayLineup
    );
    const subtitle = hasDbLineups
      ? lineupStatusLabel(sheetStatus)
      : "Predicted XI · from squad pool";

    return (
      <section>
        <LineupsHeader matchId={match.id} subtitle={subtitle} />
        <FootballLineupPitch
          match={match}
          events={events}
          sport={sport}
          motmPlayerId={motm?.player_id ?? null}
          homeLineup={homePitch}
          awayLineup={awayPitch}
          playersById={playersById}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TeamLineupCard
            teamName={match.home_team?.name ?? "Home"}
            code={match.home_team?.department?.short_code ?? "H"}
            logoUrl={match.home_team?.logo_url}
            lineup={homeLineup}
          />
          <TeamLineupCard
            teamName={match.away_team?.name ?? "Away"}
            code={match.away_team?.department?.short_code ?? "A"}
            logoUrl={match.away_team?.logo_url}
            lineup={awayLineup}
          />
        </div>
      </section>
    );
  }

  if (homeLineup || awayLineup) {
    return (
      <section>
        <LineupsHeader
          matchId={match.id}
          subtitle={
            hasDbLineups ? lineupStatusLabel(sheetStatus) : "Predicted XI · from squad pool"
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TeamLineupCard
            teamName={match.home_team?.name ?? "Home"}
            code={match.home_team?.department?.short_code ?? "H"}
            logoUrl={match.home_team?.logo_url}
            lineup={homeLineup}
          />
          <TeamLineupCard
            teamName={match.away_team?.name ?? "Away"}
            code={match.away_team?.department?.short_code ?? "A"}
            logoUrl={match.away_team?.logo_url}
            lineup={awayLineup}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <LineupsHeader matchId={match.id} />
      <p className="table-card px-4 py-8 text-center text-sm opacity-60">
        Lineups not available — not submitted by club.
      </p>
    </section>
  );
}

function buildFootballPitchData(
  match: Match,
  home: PublicMatchLineup | null,
  away: PublicMatchLineup | null
): {
  homePitch: TeamPitchLineup | null;
  awayPitch: TeamPitchLineup | null;
  playersById: Record<string, Player>;
} {
  const playersById: Record<string, Player> = {};
  for (const side of [home, away]) {
    for (const p of side?.resolved ?? []) {
      playersById[p.id] = p;
    }
  }

  const homePitch =
    home && match.home_team_id
      ? buildTeamPitchLineup({
          matchId: match.id,
          teamId: match.home_team_id,
          formation: "4-3-3",
          starters: home.resolved.filter((p) => p.is_starting).map((p) => ({ id: p.id })),
        })
      : null;
  const awayPitch =
    away && match.away_team_id
      ? buildTeamPitchLineup({
          matchId: match.id,
          teamId: match.away_team_id,
          formation: "4-3-3",
          starters: away.resolved.filter((p) => p.is_starting).map((p) => ({ id: p.id })),
        })
      : null;

  return { homePitch, awayPitch, playersById };
}

function LineupsHeader({
  matchId,
  subtitle,
}: {
  matchId: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-extrabold">Lineups</h2>
        {subtitle && <p className="mt-1 text-xs text-accent/55">{subtitle}</p>}
      </div>
      <ShareControls
        title="Match lineups"
        path={`/matches/${matchId}`}
        posterPath={`/matches/${matchId}/lineup/opengraph-image`}
        compact
      />
    </div>
  );
}

function TeamLineupCard({
  teamName,
  code,
  logoUrl,
  lineup,
}: {
  teamName: string;
  code: string;
  logoUrl?: string | null;
  lineup: PublicMatchLineup | null;
}) {
  const starters = lineup?.resolved.filter((p) => p.is_starting) ?? [];
  const bench = lineup?.resolved.filter((p) => !p.is_starting) ?? [];

  return (
    <div className="table-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-rule px-4 py-3">
        <TeamCrest code={code} logoUrl={logoUrl} alt={teamName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold">{teamName}</p>
          {lineup && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent/50">
              {lineupStatusLabel(lineup.status)}
            </p>
          )}
        </div>
      </div>

      {lineup && lineup.resolved.length > 0 ? (
        <div>
          <ul className="divide-y divide-rule">
            {starters.map((p) => (
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
                </span>
              </li>
            ))}
          </ul>
          {bench.length > 0 && (
            <>
              <p className="border-t border-rule bg-surface/60 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-accent/50">
                Bench
              </p>
              <ul className="divide-y divide-rule">
                {bench.map((p) => (
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
                    <span className="text-[10px] font-bold uppercase opacity-50">Sub</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-sm opacity-60">
          Lineup not available — not submitted by club.
        </p>
      )}
    </div>
  );
}
