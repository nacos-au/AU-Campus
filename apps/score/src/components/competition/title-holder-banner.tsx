import { Trophy } from "lucide-react";
import { TeamCrest } from "@/components/ui/team-crest";
import type { TitleHolder } from "@/lib/types/database";

/** Reigning champion — always shown above the competition structure. */
export function TitleHolderBanner({ holder }: { holder: TitleHolder }) {
  return (
    <div>
      <h2 className="mb-2 font-display text-sm font-extrabold">Title holder</h2>
      <div className="inline-flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
        <TeamCrest
          code={holder.short_code ?? holder.team_name.slice(0, 3).toUpperCase()}
          logoUrl={holder.logo_url}
          alt={holder.team_name}
          size="sm"
        />
        <span className="font-display text-sm font-bold">{holder.team_name}</span>
        <Trophy className="h-4 w-4 text-accent" aria-label={`${holder.season} champions`} />
      </div>
    </div>
  );
}
