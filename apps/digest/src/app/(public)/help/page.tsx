import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Help Center" };

export default function HelpCenterPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">Help Center</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Answers for readers of {site.masthead}.
        </p>
      </header>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-ink">
        <section>
          <h2 className="font-serif text-xl font-bold">Buying print editions</h2>
          <p className="mt-2 text-ink-soft">
            Sign in, open{" "}
            <Link href="/editions" className="underline underline-offset-2 hover:text-ink">
              Print Editions
            </Link>
            , and purchase an issue. Paid editions unlock instantly in your{" "}
            <Link href="/account" className="underline underline-offset-2 hover:text-ink">
              Library
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold">Account &amp; sign-in</h2>
          <p className="mt-2 text-ink-soft">
            One campus login works for AU Digest and AU Score. Update your display name under{" "}
            <Link href="/account/settings" className="underline underline-offset-2 hover:text-ink">
              Account settings
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold">Contact the newsroom</h2>
          <p className="mt-2 text-ink-soft">
            {site.university}
            <br />
            {site.address}
          </p>
        </section>
      </div>
    </div>
  );
}
