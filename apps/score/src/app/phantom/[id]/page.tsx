import { PageContent } from "@/components/layout/page-content";
import { PhantomSessionClient } from "@/components/phantom/phantom-session-client";
import { PHANTOM_BRAND } from "@/lib/phantom/types";

export const metadata = {
  title: `${PHANTOM_BRAND.name} session`,
  description: PHANTOM_BRAND.tagline,
};

export default async function PhantomSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageContent>
      <PhantomSessionClient sessionId={id} />
    </PageContent>
  );
}
