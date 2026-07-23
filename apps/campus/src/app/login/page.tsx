import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPreferDemoCookie } from "@/app/actions/demo-mode";
import { isPreferDemo } from "@/lib/demo-mode";
import { digestAuthUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Sign in — AU Campus",
};

export default async function LoginPage() {
  const preferDemo = isPreferDemo(await getPreferDemoCookie());
  const authUrl = digestAuthUrl("login", undefined, preferDemo);

  return (
    <div className="mx-auto flex min-h-screen max-w-[520px] flex-col px-4 py-10 sm:px-6">
      <SiteHeader />

      <main className="flex flex-1 flex-col justify-center">
        <h1 className="text-2xl font-bold">Sign in to AU Campus</h1>
        <p className="mt-3 text-sm leading-relaxed opacity-70">
          Use the same email and password across Digest and Score. Sign-in is handled by AU
          Digest for now — you&apos;ll return here after.
        </p>

        <Link
          href={authUrl}
          className="mt-8 block rounded-xl bg-[var(--accent)] py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
        >
          Continue to sign in
        </Link>

        <p className="mt-6 text-center text-sm opacity-60">
          New here?{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </main>
    </div>
  );
}
