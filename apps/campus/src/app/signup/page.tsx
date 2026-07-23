import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPreferDemoCookie } from "@/app/actions/demo-mode";
import { isPreferDemo } from "@/lib/demo-mode";
import { digestAuthUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Sign up — AU Campus",
};

export default async function SignupPage() {
  const preferDemo = isPreferDemo(await getPreferDemoCookie());
  const authUrl = digestAuthUrl("signup", undefined, preferDemo);

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col px-4 py-10 sm:px-6">
      <SiteHeader />

      <main className="flex flex-1 flex-col justify-center">
        <h1 className="text-2xl font-bold">Create your AU Campus account</h1>
        <p className="mt-3 text-sm leading-relaxed opacity-70">
          One account for AU Digest, AU Score, and future campus apps. You&apos;ll complete
          signup on AU Digest — we&apos;ll bring you back here when you&apos;re done.
        </p>

        <Link
          href={authUrl}
          className="mt-8 block rounded-xl bg-[var(--accent)] py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
        >
          Continue to sign up
        </Link>

        <p className="mt-6 text-center text-sm opacity-60">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
