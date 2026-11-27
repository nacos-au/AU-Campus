import Link from "next/link";
import { TeamCrest } from "@/components/ui/team-crest";
import { getHeadToHeadAsync } from "@/lib/match/head-to-head";
import type { SportId } from "@/lib/utils/sport";

export async function HeadToHeadCard({
  sport,
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  excludeMatchId,
}: {
  sport: SportId;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  excludeMatchId?: string;
}) {
  const { meetings, wins, draws, losses } = await getHeadToHeadAsync(
    sport,
    teamAId,
    teamBId,
    excludeMatchId
  );

  if (meetings.length === 0) {
    return (
      <div className="table-card px-4 py-6 text-center text-sm opacity-60">
        {teamAName} and {teamBName} haven&apos;t met yet.
      </div>
    );
  }

  return (
    <div className="table-card overflow-hidden">
      <div className="flex items-center justify-center gap-8 border-b border-rule px-4 py-4 text-center">
        <HeadToHeadStat label={teamAName} value={wins} />
        {sport === "football" && <HeadToHeadStat label="Draws" value={draws} />}
        <HeadToHeadStat label={teamBName} value={losses} />
      </div>
      <ul className="divide-y divide-rule">
        {meetings.map((meeting) => (
          <li key={meeting.match_id}>
            <Link
              href={`/matches/${meeting.match_id}?sport=${sport}`}
              className="interactive-row flex items-center gap-3 px-4 py-3"
            >
              <span className="w-20 shrink-0 truncate text-xs opacity-50">
                {new Date(meeting.scheduled_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate text-sm font-semibold">{meeting.home_team_name}</span>
                <TeamCrest code={meeting.home_code || "AU"} logoUrl={meeting.home_logo_url} alt={meeting.home_team_name} size="xs" />
              </span>
              <span className="shrink-0 rounded-md bg-surface px-2 py-1 font-display text-sm font-extrabold tabular-nums">
                {meeting.home_score}–{meeting.away_score}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <TeamCrest code={meeting.away_code || "AU"} logoUrl={meeting.away_logo_url} alt={meeting.away_team_name} size="xs" />
                <span className="truncate text-sm font-semibold">{meeting.away_team_name}</span>
              </span>
              <span className="hidden w-28 shrink-0 truncate text-right text-xs opacity-50 sm:block">
                {meeting.tournament_name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeadToHeadStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-2xl font-extrabold text-accent">{value}</p>
      <p className="max-w-[110px] truncate text-xs opacity-60">{label}</p>
    </div>
  );
}
