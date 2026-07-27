import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <>
      <BrandedSection title="Admin" activeSport="football" />
      <PageContent>
        <AdminDashboard />
      </PageContent>
    </>
  );
}
