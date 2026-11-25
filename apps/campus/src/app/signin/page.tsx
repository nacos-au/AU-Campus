import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SignInForm } from "@/components/signin-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <Suspense fallback={null}>
          <SignInForm />
        </Suspense>
      </main>
    </div>
  );
}
