import { AdminAwardsManager } from "@/components/admin/admin-awards-manager";
import { AdminMatchManager } from "@/components/admin/admin-match-manager";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { AdminReconcilePanel } from "@/components/admin/admin-reconcile-panel";
import { AdminSuspensionsManager } from "@/components/admin/admin-suspensions-manager";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";
import { getSessionStaff } from "@/lib/auth/roles";

export const metadata = { title: "Matches · Admin" };

export default async function AdminMatchesPage() {
  const staff = await getSessionStaff();
  const isAdmin = Boolean(staff?.isAdmin);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Matches</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Reconcile past results with scorers and assists. Friendlies and one-off posts stay here —
          competition fixtures are still claimed by keepers on match day.
        </p>
      </div>
      <AdminReconcilePanel />
      {isAdmin && <AdminPostResultTool />}
      <AdminMatchManager />
      <AdminSuspensionsManager />
      {isAdmin && <AdminVenueManager />}
      {!isAdmin && (
        <p className="text-sm text-accent/60">
          Season awards moved to the Awards tab. Venues and new friendlies stay with admins.
        </p>
      )}
      {isAdmin && <AdminAwardsManager />}
    </div>
  );
}
