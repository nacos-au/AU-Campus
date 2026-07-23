import { WinProbabilityBars } from "@/components/match/win-probability";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { LiveBadge } from "@/components/layout/site-header";
import { TeamCrest } from "@/components/ui/team-crest";
import { DEMO_EVENTS, DEMO_MATCHES } from "@/lib/data/demo";
import { dbIdToSport, parseSportParam } from "@/lib/utils/sport";
import { getSportConfig, scoreUnitLabel } from "@/lib/utils/sport-config";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = DEMO_MATCHES.find((m) => m.id === id);
  if (!match) return { title: "Match" };
  const sport = dbIdToSport(match.sport_id);
  const config = getSportConfig(sport);
  if (config.isEventSport) {
    return { title: match.home_team?.name ?? "Event" };
  }
  return { title: `${match.home_team?.name} vs ${match.away_team?.name}` };
}

export default async function MatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}) {
  const { id } = await params;
  const { sport } = await searchParams;
  const match = DEMO_MATCHES.find((m) => m.id === id);
  if (!match) notFound();

  const matchSport = dbIdToSport(match.sport_id);
  const activeSport = parseSportParam(sport ?? matchSport);
  const config = getSportConfig(matchSport);
  const events = DEMO_EVENTS.filter((e) => e.match_id === id);
  const isLive = match.status === "live";
  const unit = scoreUnitLabel(config.scoreUnit);

  const title = config.isEventSport
    ? (match.home_team?.name ?? "Event")
    : `${match.home_team?.name} vs ${match.away_team?.name}`;

  return (
    <>
      <BrandedSection title={title} activeSport={activeSport} />
      <PageContent>
        <div className="border-b border-rule py-10">
          <div className="mx-auto max-w-[1200px] px-4 text-center sm:px-6">
            <p className="mb-4 text-sm opacity-70">
              {isLive && <><LiveBadge /> · </>}
              {match.tournament?.name}
            </p>

            {config.isEventSport ? (
              <div className="flex flex-col items-center gap-4">
                <TeamCrest code={match.home_team?.department?.short_code ?? "AU"} logoUrl={match.home_team?.logo_url} alt={match.home_team?.name} size="lg" />
                <p className="font-display text-2xl font-bold">{match.home_team?.name}</p>
                {isLive && <p className="text-sm opacity-70">Final in progress</p>}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-8 sm:gap-16">
                <ScoreTeam
                  name={match.home_team?.name ?? "Home"}
                  code={match.home_team?.department?.short_code ?? "—"}
                  score={match.home_score}
                  href={match.home_team_id ? `/teams/${match.home_team_id}?sport=${matchSport}` : undefined}
                  unit={unit}
                  logoUrl={match.home_team?.logo_url}
                />
                <div>
                  <p className="text-3xl font-light opacity-30">–</p>
                  {isLive && (
                    <p className="mt-1 text-sm">
                      {matchSport === "basketball" ? "Q3 08:42" : matchSport === "volleyball" ? "Set 4" : "41'24 (+2m)"}
                    </p>
                  )}
                </div>
                <ScoreTeam
                  name={match.away_team?.name ?? "Away"}
                  code={match.away_team?.department?.short_code ?? "—"}
                  score={match.away_score}
                  href={match.away_team_id ? `/teams/${match.away_team_id}?sport=${matchSport}` : undefined}
                  unit={unit}
                  logoUrl={match.away_team?.logo_url}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-3">
          <section className="lg:col-span-2">
            <h2 className="mb-4 font-display text-xl font-extrabold">
              {config.isEventSport ? "Event Timeline" : "Match Events"}
            </h2>
            <div className="table-card divide-y divide-rule">
              {events.length === 0 ? (
                <p className="p-8 text-center opacity-70">No events yet</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 px-5 py-4 hover:bg-wrapper">
                    <span className="w-12 text-sm opacity-60">{event.match_time}</span>
                    <Link href={`/players/${event.player.id}?sport=${matchSport}`} className="font-display font-bold hover:underline">
                      {event.player.first_name} {event.player.last_name}
                    </Link>
                    <span className="text-sm capitalize opacity-70">
                      {event.event_type.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {match.win_probability && (
            <aside className="table-card p-5">
              <h3 className="mb-4 font-display text-sm font-extrabold uppercase">Win Probability</h3>
              <WinProbabilityBars data={match.win_probability} showDraw={config.showDraw} />
            </aside>
          )}
        </div>
      </PageContent>
    </>
  );
}

function ScoreTeam({
  name,
  code,
  score,
  href,
  unit,
  logoUrl,
}: {
  name: string;
  code: string;
  score: number;
  href?: string;
  unit: string | null;
  logoUrl?: string | null;
}) {
  const inner = (
    <>
      <div className="flex justify-center">
        <TeamCrest code={code} logoUrl={logoUrl} alt={name} size="lg" />
      </div>
      <p className="mt-3 font-display text-lg font-bold">{name}</p>
      <p className="mt-1 font-display text-4xl font-extrabold tabular-nums sm:text-5xl">{score}</p>
      {unit && <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-50">{unit}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="text-center hover:opacity-80">{inner}</Link>
  ) : (
    <div className="text-center">{inner}</div>
  );
}
