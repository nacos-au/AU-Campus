import type { Metadata } from "next";
import { PageContent } from "@/components/layout/page-content";
import { PhantomSharePreview } from "@/components/phantom/phantom-share-preview";
import { PHANTOM_BRAND } from "@/lib/phantom/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Share · ${PHANTOM_BRAND.name}`,
    description: "Preview the Phantom results card before sharing.",
    openGraph: {
      title: `${PHANTOM_BRAND.name} results`,
      images: [{ url: `/phantom/${id}/opengraph-image` }],
    },
    twitter: {
      card: "summary_large_image",
      images: [`/phantom/${id}/twitter-image`],
    },
  };
}

export default async function PhantomSharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageContent>
      <PhantomSharePreview sessionId={id} />
    </PageContent>
  );
}
