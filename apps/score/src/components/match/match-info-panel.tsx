import Link from "next/link";
import { Calendar, ChevronRight, Flag, MapPin, Trophy, User } from "lucide-react";
import type { Match } from "@/lib/types/database";
import type { MatchMeta } from "@/lib/match/match-meta";
import { dbIdToSport } from "@/lib/utils/sport";

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

export function MatchInfoPanel({ match, meta }: { match: Match; meta: MatchMeta }) {
  const sport = dbIdToSport(match.sport_id);

  return (
    <section className="table-card divide-y divide-rule">
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
      <InfoRow
        icon={<User className="h-5 w-5" />}
        label="Referee"
        value={meta.referee}
      />
    </section>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
  <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center text-accent/70">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-accent/50">{label}</p>
        <p className="font-display text-sm font-bold text-accent">{value}</p>
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
