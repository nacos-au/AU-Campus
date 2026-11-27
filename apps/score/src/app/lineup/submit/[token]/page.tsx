import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { RepLineupForm } from "@/components/lineup/rep-lineup-form";
import { getLineupLinkContext } from "@/lib/data/lineup-links";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Submit starting XI · AU Score",
  robots: { index: false, follow: false },
};

export default async function LineupSubmitPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getLineupLinkContext(token);

  return (
    <>
      <BrandedSection title="Starting XI" showSubNav={false} />
      <PageContent>
        <div className="mx-auto max-w-[720px] px-4 py-6 sm:px-6">
          {"error" in context ? (
            <div className="table-card p-6 text-center">
              <h2 className="font-display text-lg font-extrabold">Link not available</h2>
              <p className="mt-2 text-sm text-accent/80">{context.error}</p>
            </div>
          ) : (
            <RepLineupForm token={token} context={context} />
          )}
        </div>
      </PageContent>
    </>
  );
}
