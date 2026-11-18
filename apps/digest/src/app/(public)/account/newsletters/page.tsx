import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Newsletters" };

export default async function NewslettersPage() {
  const { user } = await getSessionProfile();
  if (!user) redirect("/login?next=/account/newsletters");

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <Link href="/account" className="hover:text-ink">
            Account
          </Link>{" "}
          / Newsletters
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold">Newsletters</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Campus briefings and section digests — coming soon.
        </p>
      </header>

      <div className="mt-10 border border-rule-dark px-6 py-10 text-center">
        <p className="font-serif text-xl font-bold text-ink">No newsletters yet</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          When AUSA Digest launches email editions, you will manage subscriptions here.
          Your account is ready — check back after we announce the first list.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block bg-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-paper hover:bg-accent transition-colors"
        >
          Back to the paper
        </Link>
      </div>
    </div>
  );
}
