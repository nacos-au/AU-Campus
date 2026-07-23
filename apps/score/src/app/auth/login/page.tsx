import { Suspense } from "react";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign In" };

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <BrandedSection title="Sign In" activeSport="football" />
      <PageContent>
        <div className="px-4 py-10 sm:px-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </PageContent>
    </>
  );
}
