import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 100% 0%, rgba(0,78,40,0.12), transparent 55%), #f7f5f2",
        }}
        aria-hidden
      />
      <SiteHeader />
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-16">
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
      </main>
    </div>
  );
}
