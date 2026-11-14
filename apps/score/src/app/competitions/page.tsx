import Link from "next/link";
import { format } from "date-fns";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { LiveBadge } from "@/components/layout/section-title";
import { TeamCrest } from "@/components/ui/team-crest";
import { fetchPublicCompetitions, fetchPublicMatches } from "@/lib/data/repository";
import { fetchSportNameMap, sportRefToSportId } from "@/lib/data/sport-ids";
import { getScoreDemoMode } from "@/lib/data/mode";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { createClient } from "@/lib/supabase/server";
import { SPORT_LABELS } from "@/lib/utils/sport";
import { getSportConfig } from "@/lib/utils/sport-config";

export const metadata = { title: "Competitions · AU Score" };
export const dynamic = "force-dynamic";

export default async function CompetitionsHubPage() {
  const demo = !hasSupabaseConfig() || (await getScoreDemoMode());
  const sportNames =
    demo ? new Map<string, string>() : await fetchSportNameMap(await createClient());

  const [live, upcoming, competitions] = await Promise.all([
    fetchPublicMatches({ status: ["live", "paused"], limit: 40 }),
    fetchPublicMatches({ status: ["scheduled"], limit: 24 }),
    fetchPublicCompetitions(),
  ]);

  const toSport = (ref: string) => sportRefToSportId(ref, sportNames);

  return (
    <>
      <BrandedSection title="Competitions" showSubNav={false} />
      <PageContent>
        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6">
          <p className="max-w-2xl text-sm text-accent/70">
            Live fixtures, what’s next, and every published competition across campus sports.
          </p>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-xl font-extrabold">Live now</h2>
              {live.length > 0 && <LiveBadge />}
            </div>
            {live.length === 0 ? (
              <div className="table-card p-8 text-center text-sm opacity-70">
                No live fixtures right now.
              </div>
            ) : (
              <div className="table-card divide-y divide-rule overflow-hidden">
                {live.map((m) => {
                  const s = toSport(m.sport_id);
                  const config = getSportConfig(s);
                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}?sport=${s}`}
                      className="flex items-center gap-3 bg-white px-4 py-4 hover:bg-wrapper sm:px-5"
                    >
                      <LiveBadge />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-bold">
                          {config.isEventSport
                            ? (m.home_team?.name ?? "Event")
                            : `${m.home_team?.name ?? "Team A"} vs ${m.away_team?.name ?? "Team B"}`}
                        </p>
                        <p className="truncate text-xs text-accent/60">
                          {SPORT_LABELS[s]} · {m.tournament?.name ?? "Competition"}
                        </p>
                      </div>
                      {!config.isEventSport && (
                        <div className="flex items-center gap-3 font-display text-lg font-extrabold tabular-nums">
                          <TeamCrest
                            code={m.home_team?.department?.short_code ?? "H"}
                            logoUrl={m.home_team?.logo_url}
                            size="sm"
                          />
                          <span>
                            {m.home_score}:{m.away_score}
                          </span>
                          <TeamCrest
                            code={m.away_team?.department?.short_code ?? "A"}
                            logoUrl={m.away_team?.logo_url}
                            size="sm"
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <div className="table-card p-6 text-center text-sm opacity-70">No upcoming fixtures.</div>
            ) : (
              <div className="table-card divide-y divide-rule overflow-hidden">
                {upcoming.map((m) => {
                  const s = toSport(m.sport_id);
                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}?sport=${s}`}
                      className="flex items-center justify-between gap-3 bg-white px-4 py-3 hover:bg-wrapper sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold">
                          {m.home_team?.name ?? "Team A"} vs {m.away_team?.name ?? "Team B"}
                        </p>
                        <p className="truncate text-xs text-accent/60">
                          {SPORT_LABELS[s]} · {m.tournament?.name}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-xs font-bold tabular-nums opacity-70">
                        {format(new Date(m.scheduled_at), "EEE d MMM · HH:mm")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold">Open competitions</h2>
            {competitions.length === 0 ? (
              <div className="table-card p-8 text-center text-sm opacity-70">
                No published competitions yet.
              </div>
            ) : (
              <div className="table-card divide-y divide-rule overflow-hidden">
                {competitions.map((c) => {
                  const s = toSport(c.sport_id);
                  return (
                    <Link
                      key={c.id}
                      href={`/competition?sport=${s}&competition=${c.id}`}
                      className="flex items-center justify-between gap-3 bg-white px-4 py-4 hover:bg-wrapper sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-bold">{c.name}</p>
                        <p className="truncate text-xs text-accent/60">
                          {SPORT_LABELS[s]} · Season {c.season}
                          {c.title_holder?.team_name
                            ? ` · Holders ${c.title_holder.team_name}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-accent">Open</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </PageContent>
    </>
  );
}
