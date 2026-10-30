import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";

export const metadata = { title: "Competitions · Admin" };

export default function AdminCompetitionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Competitions</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Publish leagues and cups from the clubs in each sport. Keepers pick up fixtures from the
          published calendar.
        </p>
      </div>
      <AdminCompetitionWizard />
      <AdminKeeperCalendar />
    </div>
  );
}
