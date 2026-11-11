import { Suspense } from "react";
import { FeedbackLauncher } from "@/components/feedback/feedback-launcher";
import { KeeperClient } from "@/components/keeper/keeper-client";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { getSessionStaff } from "@/lib/auth/roles";

export const metadata = { title: "Record Keeper" };

export const dynamic = "force-dynamic";

export default async function KeeperPage() {
  const staff = await getSessionStaff();
  const canAccess = Boolean(staff?.isRecordKeeper || staff?.isAdmin);
  const isAdmin = Boolean(staff?.isAdmin);

  return (
    <>
      <BrandedSection title="Record Keeper" showSubNav={false} />
      <PageContent>
        <Suspense fallback={<p className="p-8 text-center opacity-70">Loading keeper…</p>}>
          <KeeperClient canAccess={canAccess} isAdmin={isAdmin} />
        </Suspense>
      </PageContent>
      <FeedbackLauncher />
    </>
  );
}
