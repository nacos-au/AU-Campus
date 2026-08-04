import { PageContent } from "@/components/layout/page-content";
import { PhantomHub } from "@/components/phantom/phantom-hub";
import { PHANTOM_BRAND } from "@/lib/phantom/types";

export const metadata = {
  title: PHANTOM_BRAND.name,
  description: PHANTOM_BRAND.tagline,
};

export default function PhantomPage() {
  return (
    <PageContent>
      <PhantomHub />
    </PageContent>
  );
}
