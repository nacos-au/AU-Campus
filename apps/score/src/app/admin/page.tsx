import { AdminHubCards } from "@/components/admin/admin-shell";
import { getSessionStaff } from "@/lib/auth/roles";
import { fetchTeamsForSport } from "@/lib/data/roster";

export const metadata = { title: "Admin" };

export default async function AdminHubPage() {
  const [staff, footballClubs] = await Promise.all([
    getSessionStaff(),
    fetchTeamsForSport("football"),
  ]);
  const auCount = footballClubs.filter((t) => !t.is_guest).length;
  const guestCount = footballClubs.filter((t) => t.is_guest).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">
          {staff?.isAdmin ? "Management" : "Record keeper ops"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          {staff?.isAdmin
            ? "Season office for campus sport. Set up clubs and players, publish competitions, then keep real fixtures moving — friendlies stay under Matches."
            : "Reconcile match results, maintain season awards, and keep player records accurate. Live officiating stays on Record Keeper."}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent/50">
          Football books · {auCount} AU clubs · {guestCount} guests
        </p>
      </div>
      <AdminHubCards staff={staff} />
    </div>
  );
}
