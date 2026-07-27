import Link from "next/link";
import { AwardLineupPitch } from "@/components/stats/award-lineup-pitch";
import type { SeasonAward } from "@/lib/data/demo-awards";
import { awardTypeLabelFor } from "@/lib/data/demo-awards";
import type { SportId } from "@/lib/utils/sport";

export function AwardsShowcase({
  awards,
  sport,
  competitionType = "league",
}: {
  awards: SeasonAward[];
  sport: SportId;
  competitionType?: "league" | "cup";
}) {
  if (awards.length === 0) return null;

  const lineupAwards = awards.filter((a) => a.lineup && a.lineup.length > 0);
  const cardAwards = awards.filter((a) => !a.lineup || a.lineup.length === 0);

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-xl font-extrabold">Season Awards</h2>

      {cardAwards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cardAwards.map((a) => (
            <div key={a.id} className="table-card p-4">
              <p className="font-display text-xs font-extrabold uppercase tracking-wide text-accent">
                {awardTypeLabelFor(a.award_type, competitionType)}
                {a.week_number ? ` · MW ${a.week_number}` : ""}
              </p>
              {a.player_id ? (
                <Link href={`/players/${a.player_id}?sport=${sport}`} className="mt-2 block font-display font-bold hover:underline">
                  {a.player_name}
                </Link>
              ) : (
                <p className="mt-2 font-display font-bold">{a.team_name}</p>
              )}
              {a.team_name && a.player_name && (
                <p className="text-sm opacity-60">{a.team_name}</p>
              )}
              {a.value != null && (
                <p className="mt-1 font-display text-lg font-extrabold tabular-nums">{a.value}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {lineupAwards.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {lineupAwards.map((a) => (
            <AwardLineupPitch
              key={a.id}
              title={awardTypeLabelFor(a.award_type, competitionType)}
              subtitle={a.week_number ? `Matchweek ${a.week_number}` : a.season}
              lineup={a.lineup!}
              sport={sport}
              publishedAt={a.published_at}
            />
          ))}
        </div>
      )}
    </section>
  );
}
