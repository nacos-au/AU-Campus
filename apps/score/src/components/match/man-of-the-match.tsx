import Link from "next/link";
import { Star } from "lucide-react";
import { TeamCrest } from "@/components/ui/team-crest";
import { PlayerName } from "@/components/ui/player-name";
import type { ManOfTheMatch } from "@/lib/match/match-meta";
import type { SportId } from "@/lib/utils/sport";
import { playerAvatarForId } from "@/lib/utils/sport-assets";

export function ManOfTheMatchCard({
  motm,
  sport,
}: {
  motm: ManOfTheMatch;
  sport: SportId;
}) {
  const avatar = motm.avatar_url ?? playerAvatarForId(motm.player_id);

  return (
    <section className="table-card overflow-hidden">
      <div className="relative bg-gradient-to-r from-surface via-white to-surface px-5 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -left-4 top-2 h-16 w-16 rotate-12 rounded-lg bg-accent/5" />
          <div className="absolute -right-2 bottom-0 h-20 w-20 -rotate-6 rounded-lg bg-accent/5" />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0d9488] text-white">
                <Star className="h-4 w-4 fill-current" />
              </span>
              <h3 className="font-display text-base font-extrabold text-accent">Player of the match</h3>
            </div>

            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white"
              />
              <div className="min-w-0">
                <Link
                  href={`/players/${motm.player_id}?sport=${sport}`}
                  className="font-display text-base font-extrabold text-accent hover:underline"
                >
                  <PlayerName player={motm} />
                </Link>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-accent/60">
                  <TeamCrest code={motm.team_name.slice(0, 3).toUpperCase()} logoUrl={motm.team_logo_url} alt={motm.team_name} size="xs" />
                  <span>{motm.team_name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#0d9488] font-display text-sm font-extrabold text-white">
            {motm.rating.toFixed(1)}
          </div>
        </div>
      </div>
    </section>
  );
}
