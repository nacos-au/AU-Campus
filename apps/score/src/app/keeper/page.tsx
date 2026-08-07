import { Suspense } from "react";
import { KeeperClient } from "@/components/keeper/keeper-client";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";

export const metadata = { title: "Record Keeper" };

export default function KeeperPage() {
  return (
    <>
      <BrandedSection title="Record Keeper" showSubNav={false} />
      <PageContent>
        <Suspense fallback={<p className="p-8 text-center opacity-70">Loading keeper…</p>}>
          <KeeperClient />
        </Suspense>
      </PageContent>
    </>
  );
}
