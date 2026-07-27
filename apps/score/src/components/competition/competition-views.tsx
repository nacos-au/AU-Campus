import type { BracketFixture, CompetitionTimelinePhase, GroupStandingRow, MeetEventFixture, Tournament } from "@/lib/types/database";
import { FixtureKickoffLabel } from "@/components/match/fixture-kickoff-label";
import { TeamCrest, PlayerAvatar } from "@/components/ui/team-crest";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import type { SportId } from "@/lib/utils/sport";

/**
 * Competition banner + phase progress track. Dark banner with the competition
 * name, season pill and a horizontal timeline of phases: a dot per phase on a
 * progress line, completed segments filled, active phase highlighted.
 */
export function CompetitionTimeline({
  phases,
  tournament,
}: {
  phases: CompetitionTimelinePhase[];
  tournament?: Pick<Tournament, "name" | "season">;
}) {
  const activeIndex = phases.findIndex((p) => p.status === "active");
  const progressIndex = activeIndex === -1
    ? phases.every((p) => p.status === "completed") ? phases.length - 1 : 0
    : activeIndex;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink px-5 pb-6 pt-5 text-white sm:px-8">
      {/* Palette glow along the bottom edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 opacity-50 blur-2xl"
        style={{
          background:
            "linear-gradient(90deg, var(--accent) 0%, var(--brand-green-mid) 55%, var(--accent) 100%)",
        }}
      />

      {tournament && (
        <div className="relative mb-6 flex items-center gap-3">
          <Trophy className="h-7 w-7 shrink-0 opacity-90" />
          <h2 className="font-display text-xl font-extrabold sm:text-2xl">{tournament.name}</h2>
          <span className="rounded-full bg-white px-3 py-1 font-display text-xs font-bold text-ink">
            {tournament.season}
          </span>
        </div>
      )}

      <div className="relative">
        {/* Track */}
        <div className="absolute left-0 right-0 top-[5px] h-0.5 bg-white/25" />
        <div
          className="absolute left-0 top-[5px] h-0.5 bg-white"
          style={{ width: `${(progressIndex / Math.max(1, phases.length - 1)) * 100}%` }}
        />
        <ol className="relative flex justify-between">
          {phases.map((phase) => (
            <li key={phase.phase} className="flex min-w-0 flex-col items-center gap-2 first:items-start last:items-end">
              <span
                className={cn(
                  "block h-3 w-3 rounded-full",
                  phase.status === "completed" && "bg-white",
                  phase.status === "active" && "bg-white ring-4 ring-white/30",
                  phase.status === "upcoming" && "border-2 border-white/40 bg-ink"
                )}
              />
              <span
                className={cn(
                  "max-w-24 truncate text-center font-display text-[11px] font-bold sm:max-w-none sm:text-xs",
                  phase.status === "upcoming" ? "opacity-50" : "opacity-90"
                )}
                title={`${phase.label} — ${phase.completed_count}/${phase.fixture_count} fixtures`}
              >
                {phase.label}
              </span>
              <span className="text-[10px] tabular-nums opacity-40">
                {phase.completed_count}/{phase.fixture_count}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function GroupTables({
  rows,
  sport,
}: {
  rows: GroupStandingRow[];
  sport: SportId;
}) {
  const groups = [...new Set(rows.map((r) => r.group_id))];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {groups.map((groupId) => {
        const groupRows = rows.filter((r) => r.group_id === groupId);
        const groupName = groupRows[0]?.group_name ?? groupId;
        return (
          <div key={groupId} className="table-card overflow-hidden">
            <h3 className="border-b border-rule px-5 py-3 font-display text-sm font-extrabold uppercase">
              {groupName}
            </h3>
            <div className="table-scroll-x">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-rule text-[12px] font-bold uppercase opacity-60">
                    <th className="px-5 py-2 text-left">Team</th>
                    <th className="px-2 py-2 text-center">Pl</th>
                    <th className="px-2 py-2 text-center">W</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">L</th>
                    <th className="px-2 py-2 text-center">GD</th>
                    <th className="px-5 py-2 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row) => (
                    <tr key={`${row.group_id}-${row.team_id}`} className="border-b border-rule last:border-0">
                      <td className="min-w-[140px] px-5 py-3">
                        <Link href={`/teams/${row.team_id}?sport=${sport}`} className="flex items-center gap-2 hover:underline">
                          <TeamCrest code={row.short_code} logoUrl={row.logo_url} alt={row.team_name} size="sm" />
                          <span className="font-display text-sm font-bold">{row.team_name}</span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-center text-[12px] tabular-nums">{row.played}</td>
                      <td className="px-2 py-3 text-center text-[12px] tabular-nums">{row.won}</td>
                      <td className="px-2 py-3 text-center text-[12px] tabular-nums">{row.drawn}</td>
                      <td className="px-2 py-3 text-center text-[12px] tabular-nums">{row.lost}</td>
                      <td className="px-2 py-3 text-center text-[12px] tabular-nums">
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                      <td className="px-5 py-3 text-center text-[12px] font-display font-extrabold tabular-nums">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function KnockoutBracket({
  fixtures,
  sport,
  playerMode = false,
}: {
  fixtures: BracketFixture[];
  sport: SportId;
  playerMode?: boolean;
}) {
  const rounds = [...new Set(fixtures.map((f) => f.round))];

  return (
    <div className="space-y-8">
      {rounds.map((round) => {
        const roundFixtures = fixtures.filter((f) => f.round === round);
        const label = roundFixtures[0]?.round_label ?? round;
        return (
          <section key={round}>
            <h3 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
              {label}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {roundFixtures.map((fixture) => (
                <BracketCard key={fixture.id} fixture={fixture} sport={sport} playerMode={playerMode || fixture.bracket_mode === "player"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MeetSchedule({
  events,
  sport,
}: {
  events: MeetEventFixture[];
  sport: SportId;
}) {
  const categories = [...new Set(events.map((e) => e.category))];

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryEvents = events.filter((e) => e.category === category);
        return (
          <section key={category}>
            <h3 className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide opacity-60">
              {category}
            </h3>
            <div className="table-card divide-y divide-rule overflow-hidden">
              {categoryEvents.map((event) => {
                const row = (
                  <div
                    className={cn(
                      "flex items-center justify-between gap-4 px-5 py-4",
                      event.status === "live" && "bg-accent/5",
                      event.status === "completed" && "opacity-80"
                    )}
                  >
                    <div>
                      <p className="font-display font-bold">{event.event_name}</p>
                      {event.venue && <p className="text-xs opacity-50">{event.venue}</p>}
                    </div>
                    <div className="text-right">
                      {event.status === "live" && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">Live</span>
                      )}
                      {event.status === "scheduled" && event.scheduled_at && (
                        <p className="text-xs opacity-50">
                          {new Date(event.scheduled_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                      {event.status === "completed" && (
                        <span className="text-xs font-semibold opacity-50">Completed</span>
                      )}
                    </div>
                  </div>
                );
                return event.match_id ? (
                  <Link key={event.id} href={`/matches/${event.match_id}?sport=${sport}`} className="block hover:bg-surface">
                    {row}
                  </Link>
                ) : (
                  <div key={event.id}>{row}</div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function BracketCard({
  fixture,
  sport,
  playerMode,
}: {
  fixture: BracketFixture;
  sport: SportId;
  playerMode: boolean;
}) {
  const content = (
    <div
      className={cn(
        "table-card px-4 py-4",
        fixture.status === "tbd" && "border-dashed opacity-50",
        fixture.status === "live" && "ring-2 ring-accent"
      )}
    >
      <BracketSide
        name={fixture.home_team_name}
        subtitle={playerMode ? (fixture.home_subtitle ?? null) : null}
        avatarUrl={playerMode ? (fixture.home_avatar_url ?? null) : null}
        score={fixture.home_score}
        playerMode={playerMode}
      />
      <div className="my-2 border-t border-rule" />
      <BracketSide
        name={fixture.away_team_name}
        subtitle={playerMode ? (fixture.away_subtitle ?? null) : null}
        avatarUrl={playerMode ? (fixture.away_avatar_url ?? null) : null}
        score={fixture.away_score}
        playerMode={playerMode}
      />
      {fixture.home_penalties != null && fixture.away_penalties != null && (
        <p className="mt-2 text-center text-xs font-semibold opacity-60">
          Pens {fixture.home_penalties}–{fixture.away_penalties}
        </p>
      )}
      {fixture.status === "scheduled" && fixture.scheduled_at && (
        <div className="mt-2 flex justify-center">
          <FixtureKickoffLabel scheduledAt={fixture.scheduled_at} status={fixture.status} />
        </div>
      )}
    </div>
  );

  if (fixture.match_id) {
    return <Link href={`/matches/${fixture.match_id}?sport=${sport}`}>{content}</Link>;
  }
  return content;
}

function BracketSide({
  name,
  subtitle,
  avatarUrl,
  score,
  playerMode,
}: {
  name: string | null;
  subtitle: string | null;
  avatarUrl?: string | null;
  score: number | null;
  playerMode: boolean;
}) {
  const parts = (name ?? "TBD").split(" ");
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        {playerMode && name ? (
          <PlayerAvatar firstName={firstName} lastName={lastName} avatarUrl={avatarUrl} size="sm" />
        ) : !playerMode && subtitle ? (
          <TeamCrest code={subtitle} alt={name ?? ""} size="sm" />
        ) : null}
        <div className="min-w-0">
          <span className={cn("block truncate font-display text-sm font-bold", !name && "opacity-40")}>
            {name ?? "TBD"}
          </span>
          {playerMode && subtitle && (
            <span className="text-xs opacity-50">{subtitle}</span>
          )}
        </div>
      </div>
      {score != null ? (
        <span className="shrink-0 font-display font-extrabold tabular-nums">{score}</span>
      ) : (
        <span className="shrink-0 text-xs opacity-40">—</span>
      )}
    </div>
  );
}
