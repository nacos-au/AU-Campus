import { redirect } from "next/navigation";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { isAdminModeActive } from "@/app/actions/admin-mode";
import { getSessionStaff } from "@/lib/auth/roles";

export const metadata = { title: "Admin" };

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const staff = await getSessionStaff();

  if (!staff || staff.isDemoBypass) {
    redirect("/?auth=signin&next=/admin");
  }
  if (!staff.isAdmin) {
    redirect("/?sport=football");
  }
  if (!(await isAdminModeActive())) {
    redirect("/?sport=football&admin_mode=required");
  }

  return (
    <>
      <BrandedSection title="Admin" activeSport="football" />
      <PageContent>
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.06] px-4 py-3 font-display text-sm font-semibold text-accent">
          You are in Admin Mode. Changes here affect live Score data.
        </div>
        <AdminDashboard />
      </PageContent>
    </>
  );
}
