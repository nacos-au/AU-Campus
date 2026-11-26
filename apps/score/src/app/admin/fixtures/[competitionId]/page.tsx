import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FixtureCompetitionSwitcher } from "@/components/admin/fixture-competition-switcher";
import { FixtureScheduleEditor } from "@/components/admin/fixture-schedule-editor";
import { getSessionStaff } from "@/lib/auth/roles";
import { listCompetitions } from "@/lib/data/competition-rosters";
import { listCompetitionSchedule } from "@/lib/data/fixture-schedule";

export const metadata = { title: "Fixtures · Admin" };

export default async function AdminCompetitionFixturesPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const staff = await getSessionStaff();
  if (!staff?.isAdmin) redirect("/admin");

  const { competitionId } = await params;
  const competitions = await listCompetitions();
  const competition = competitions.find((c) => c.id === competitionId);
  if (!competition) notFound();

  const { rows, history } = await listCompetitionSchedule(competitionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/fixtures"
          className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All competitions
        </Link>
        <FixtureCompetitionSwitcher
          currentId={competitionId}
          competitions={competitions.map((c) => ({ id: c.id, name: c.name, season: c.season }))}
        />
      </div>

      <FixtureScheduleEditor
        key={competitionId}
        competitionId={competitionId}
        competitionName={competition.name}
        rows={rows}
        history={history}
      />
    </div>
  );
}
