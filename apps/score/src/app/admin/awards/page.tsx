import { AdminAwardsManager } from "@/components/admin/admin-awards-manager";

export const metadata = { title: "Awards · Admin" };

export default function AdminAwardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Season awards</h2>
        <p className="mt-1 max-w-2xl text-sm text-accent/70">
          Record keepers curate and publish awards with real players. Unpublished rows stay off the
          public Stats board.
        </p>
      </div>
      <AdminAwardsManager />
    </div>
  );
}
