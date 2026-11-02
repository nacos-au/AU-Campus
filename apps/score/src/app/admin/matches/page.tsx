import { AdminAwardsManager } from "@/components/admin/admin-awards-manager";
import { AdminMatchManager } from "@/components/admin/admin-match-manager";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { AdminSuspensionsManager } from "@/components/admin/admin-suspensions-manager";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";

export const metadata = { title: "Matches · Admin" };

export default function AdminMatchesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Matches</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Friendlies and one-off results stay here — competition fixtures are claimed by keepers.
        </p>
      </div>
      <AdminPostResultTool />
      <AdminMatchManager />
      <AdminSuspensionsManager />
      <AdminVenueManager />
      <AdminAwardsManager />
    </div>
  );
}
