import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { getSessionStaff } from "@/lib/auth/roles";
import { listCompetitionScheduleSummaries } from "@/lib/data/fixture-schedule";
import { formatWat } from "@/lib/schedule/shift-fixtures";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";

export const metadata = { title: "Fixtures · Admin" };

export default async function AdminFixturesPage() {
  const staff = await getSessionStaff();
  if (!staff?.isAdmin) redirect("/admin");

  const summaries = await listCompetitionScheduleSummaries();

  const bySport = new Map<SportId, typeof summaries>();
  for (const s of summaries) {
    bySport.set(s.sport, [...(bySport.get(s.sport) ?? []), s]);
  }
  const sports = (Object.keys(SPORT_LABELS) as SportId[]).filter((s) => bySport.has(s));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Fixtures</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Pick a competition to change kick-off dates and times. Move one match, or tick several
          and shift them by days. Every change is logged and shown on the match page.
        </p>
      </div>

      {sports.length === 0 && (
        <p className="table-card p-6 text-sm text-accent/60">
          No competitions yet. Create one from Competitions first.
        </p>
      )}

      {sports.map((sport) => (
        <section key={sport} className="space-y-3">
          <h3 className="font-display text-lg font-extrabold">{SPORT_LABELS[sport]}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {bySport.get(sport)!.map((s) => (
              <Link
                key={s.competition.id}
                href={`/admin/fixtures/${s.competition.id}`}
                className="table-card group flex flex-col gap-3 p-5 transition hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-base font-extrabold leading-tight">
                      {s.competition.name}
                    </h4>
                    <p className="text-xs text-accent/55">{s.competition.season}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-accent/40" />
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-accent/70">
                  <dt>Fixtures</dt>
                  <dd className="font-semibold text-accent">{s.fixture_count}</dd>
                  <dt>Next kick-off</dt>
                  <dd className="font-semibold text-accent">
                    {s.next_kickoff ? formatWat(s.next_kickoff) : "None upcoming"}
                  </dd>
                  <dt>Postponed</dt>
                  <dd
                    className={
                      s.postponed_count > 0 ? "font-semibold text-amber-800" : "font-semibold text-accent"
                    }
                  >
                    {s.postponed_count}
                  </dd>
                  <dt>Rescheduled</dt>
                  <dd className="font-semibold text-accent">{s.rescheduled_count}</dd>
                </dl>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
