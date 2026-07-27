import Link from "next/link";
import { PlayerAvatar, TeamCrest } from "@/components/ui/team-crest";
import type { AwardLineupPlayer, LineupRole } from "@/lib/data/demo-awards";
import type { SportId } from "@/lib/utils/sport";
import { cn } from "@/lib/utils/cn";

const ROW_ORDER: LineupRole[] = ["FWD", "MID", "DEF", "GK"];

/**
 * Formation-style lineup (FWD top, GK bottom) with per-player rating badges,
 * drawn over a minimalist half-pitch: halfway line + centre circle at the top,
 * goalkeeper boxes at the bottom, corner arcs bottom-left and bottom-right.
 */
export function AwardLineupPitch({
  title,
  subtitle,
  lineup,
  sport,
  publishedAt,
}: {
  title: string;
  subtitle?: string | null;
  lineup: AwardLineupPlayer[];
  sport: SportId;
  publishedAt?: string | null;
}) {
  const hasRoles = lineup.some((p) => p.role !== "PLAYER");
  const rows: AwardLineupPlayer[][] = hasRoles
    ? ROW_ORDER.map((role) => lineup.filter((p) => p.role === role)).filter((r) => r.length > 0)
    : chunk(lineup, 3);

  return (
    <div className="table-card overflow-hidden">
      <div className="border-b border-rule px-5 py-4">
        <h3 className="font-display text-lg font-extrabold">{title}</h3>
        {subtitle && <p className="text-sm opacity-60">{subtitle}</p>}
      </div>

      <div className="relative overflow-hidden bg-white px-3 pb-10 pt-8 sm:px-6">
        <PitchMarkings />

        <div className="relative space-y-7">
          {rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start justify-center",
                row.length >= 4 ? "gap-2 sm:gap-6" : "gap-4 sm:gap-12"
              )}
            >
              {row.map((p) => (
                <LineupSlot key={p.player_id} player={p} sport={sport} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {publishedAt && (
        <p className="border-t border-rule px-5 py-2 text-right text-xs opacity-50">
          Published{" "}
          {new Date(publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}

/** Minimalist half-pitch: halfway line + centre circle (top), GK boxes (bottom), corner arcs. */
function PitchMarkings() {
  const line = "border-neutral-200";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Halfway line across the top */}
      <div className={cn("absolute inset-x-0 top-0 border-t", line)} />
      {/* Centre circle bisected by the halfway line */}
      <div
        className={cn(
          "absolute left-1/2 top-0 h-10 w-20 -translate-x-1/2 rounded-b-full border-x border-b",
          line
        )}
      />
      {/* Penalty box */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 h-16 w-52 max-w-[70%] -translate-x-1/2 border-x border-t",
          line
        )}
      />
      {/* Six-yard box */}
      <div
        className={cn(
          "absolute bottom-0 left-1/2 h-7 w-24 max-w-[35%] -translate-x-1/2 border-x border-t",
          line
        )}
      />
      {/* Corner arcs, bottom-left and bottom-right */}
      <div className={cn("absolute bottom-0 left-0 h-5 w-5 rounded-tr-full border-r border-t", line)} />
      <div className={cn("absolute bottom-0 right-0 h-5 w-5 rounded-tl-full border-l border-t", line)} />
    </div>
  );
}

function LineupSlot({ player, sport }: { player: AwardLineupPlayer; sport: SportId }) {
  const [first, ...rest] = player.player_name.split(" ");
  const short = `${first[0]}. ${rest.join(" ") || first}`;

  return (
    <Link
      href={`/players/${player.player_id}?sport=${sport}`}
      className="group flex w-16 flex-col items-center text-center sm:w-20"
    >
      <div className="relative">
        <PlayerAvatar
          firstName={first}
          lastName={rest.join(" ") || first}
          avatarUrl={player.avatar_url}
          size="md"
        />
        <span className="absolute -bottom-1 -left-4 rounded bg-emerald-600 px-1 py-px font-mono text-[10px] font-bold text-white shadow">
          {player.rating.toFixed(2)}
        </span>
        <span className="absolute -bottom-1.5 -right-3">
          <TeamCrest
            code={player.team_code}
            logoUrl={player.team_logo_url}
            alt={player.team_code}
            size="xs"
          />
        </span>
      </div>
      <span className="mt-2 line-clamp-2 font-display text-[11px] font-bold leading-tight group-hover:underline sm:text-xs">
        {short}
      </span>
    </Link>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
