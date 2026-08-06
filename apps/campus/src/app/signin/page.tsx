import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SignInForm } from "@/components/signin-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 100% -10%, rgba(0,78,40,0.18), transparent 55%), radial-gradient(ellipse 60% 45% at 0% 100%, rgba(122,31,43,0.12), transparent 50%), linear-gradient(180deg, #f7f5f2 0%, #efeae3 100%)",
        }}
        aria-hidden
      />
      <SiteHeader />
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </main>
    </div>
  );
}
