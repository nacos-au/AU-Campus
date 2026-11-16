import { redirect } from "next/navigation";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { AdminSubNav } from "@/components/admin/admin-shell";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import { getSessionStaff } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getSessionStaff();

  if (!staff) {
    redirect("/?auth=signin&next=/admin");
  }
  if (!staff.canAccessAdminDesk) {
    redirect("/?sport=football");
  }
  // Admins need Admin Mode; record keepers use the ops desk without it.
  if (staff.isAdmin && !staff.isDemoBypass && !(await isAdminModeActive())) {
    redirect("/?sport=football&admin_mode=required");
  }

  const deskLabel = staff.isAdmin
    ? staff.isDemoBypass
      ? "Demo overlay — clubs, players and competitions stay in this session and are not live results."
      : "Admin Mode is on. Changes here affect live Score data."
    : "Record keeper desk — reconcile matches, awards, and player records. Competition structure stays with admins.";

  return (
    <>
      <BrandedSection title={staff.isAdmin ? "Admin" : "Ops"} showSubNav={false} />
      <AdminSubNav staff={staff} />
      <PageContent>
        <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
          <div className="mb-6 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 font-display text-sm font-semibold text-accent">
            {deskLabel}
          </div>
          {children}
        </div>
      </PageContent>
    </>
  );
}
