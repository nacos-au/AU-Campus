import type { Metadata } from "next";
import { PageContent } from "@/components/layout/page-content";
import { PhantomSessionClient } from "@/components/phantom/phantom-session-client";
import { PHANTOM_BRAND } from "@/lib/phantom/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `${PHANTOM_BRAND.name} session`,
    description: PHANTOM_BRAND.tagline,
    openGraph: {
      title: `${PHANTOM_BRAND.name} results`,
      description: PHANTOM_BRAND.tagline,
      images: [{ url: `/phantom/${id}/opengraph-image` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${PHANTOM_BRAND.name} results`,
      description: PHANTOM_BRAND.tagline,
    },
  };
}

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
