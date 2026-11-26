import Link from "next/link";
import { AlertTriangle, Calendar, CalendarClock, ChevronRight, Flag, MapPin, Trophy, User, Users } from "lucide-react";
import type { Match } from "@/lib/types/database";
import type { MatchMeta } from "@/lib/match/match-meta";
import { dbIdToSport } from "@/lib/utils/sport";
import type { RescheduleNote } from "@/lib/data/fixture-schedule";
import { formatWat } from "@/lib/schedule/shift-fixtures";

function formatMatchDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} • ${time}`;
}

function competitionLabel(match: Match): string {
  const sport = match.sport?.name ?? "Football";
  const tournament = match.tournament?.name ?? "Competition";
  return `${sport}, ${tournament}`;
}

export function MatchInfoPanel({
  match,
  meta,
  reschedule,
}: {
  match: Match;
  meta: MatchMeta;
  reschedule?: RescheduleNote | null;
}) {
  const sport = dbIdToSport(match.sport_id);
  const isPostponed = match.status === "postponed";
  const assistants = [meta.assistantReferee1, meta.assistantReferee2].filter(Boolean) as string[];

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-extrabold">Match info</h2>
      <div className="table-card divide-y divide-rule">
        <InfoRow
          icon={<Calendar className="h-5 w-5" />}
          label="Date and time"
          value={formatMatchDateTime(match.scheduled_at)}
        />
        <InfoRow
          icon={<Trophy className="h-5 w-5" />}
          label="Competition"
          value={competitionLabel(match)}
          href={`/competition?sport=${sport}`}
        />
        <InfoRow
          icon={<MapPin className="h-5 w-5" />}
          label="Venue"
          value={meta.venue}
        />
        <InfoRow
          icon={<Flag className="h-5 w-5" />}
          label="Location"
          value={meta.location}
        />
        {meta.referee && (
          <InfoRow
            icon={<User className="h-5 w-5" />}
            label="Referee"
            value={meta.referee}
          />
        )}
        {assistants.length > 0 && (
          <InfoRow
            icon={<Users className="h-5 w-5" />}
            label={assistants.length === 1 ? "Assistant referee" : "Assistant referees"}
            value={assistants.join(" · ")}
          />
        )}
        {reschedule && (
          <InfoRow
            icon={<CalendarClock className="h-5 w-5" />}
            label={reschedule.times_moved > 1 ? `Rescheduled (${reschedule.times_moved} times)` : "Rescheduled"}
            value={`Originally ${formatWat(reschedule.original_scheduled_at, true)}. Reason: ${reschedule.latest_reason}`}
            tone="warn"
          />
        )}
        {isPostponed && (
          <InfoRow
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Postponed"
            value={match.postpone_reason?.trim() || "This fixture has been postponed."}
            tone="warn"
          />
        )}
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  tone?: "warn";
}) {
  const content = (
    <div className="flex items-center gap-4 px-5 py-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center ${
          tone === "warn" ? "text-amber-700" : "text-accent/70"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${tone === "warn" ? "text-amber-700/80" : "text-accent/50"}`}>{label}</p>
        <p
          className={`font-display text-sm font-bold ${
            tone === "warn" ? "text-amber-900" : "text-accent"
          }`}
        >
          {value}
        </p>
      </div>
      {href && <ChevronRight className="h-5 w-5 shrink-0 text-accent/40" />}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-colors hover:bg-surface">
        {content}
      </Link>
    );
  }

  return content;
}
