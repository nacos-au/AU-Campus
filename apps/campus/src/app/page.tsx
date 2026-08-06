import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DIGEST_URL, SCORE_URL } from "@/lib/urls";

export default function CampusHomePage() {
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

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-5xl flex-col px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <section className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-green">
            Achievers University
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-6xl">
            AU Campus
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink-soft sm:text-lg">
            One account. Every student app. Create your campus identity here, then open Digest
            or Score whenever you need them.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-6 py-3 font-display text-sm font-bold text-white transition hover:bg-accent-hover"
            >
              Create account
            </Link>
            <a
              href={SCORE_URL}
              className="rounded-full border border-ink/20 bg-white/70 px-6 py-3 font-display text-sm font-bold text-ink backdrop-blur transition hover:border-ink"
            >
              Open AU Score
            </a>
          </div>
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
            Open an app
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <a
              href={DIGEST_URL}
              className="group border border-rule bg-white/80 p-6 backdrop-blur transition hover:border-accent"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-accent">News</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">AU Digest</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Campus newspaper, print editions, and the newsroom.
              </p>
              <span className="mt-5 inline-block font-display text-sm font-bold text-ink group-hover:underline">
                Open Digest →
              </span>
            </a>
            <a
              href={SCORE_URL}
              className="group border border-rule bg-white/80 p-6 backdrop-blur transition hover:border-green"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-green">Sports</p>
              <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">AU Score</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Live matches, tables, stats, and club profiles.
              </p>
              <span className="mt-5 inline-block font-display text-sm font-bold text-ink group-hover:underline">
                Open Score →
              </span>
            </a>
          </div>
        </section>

        <footer className="mt-auto pt-16 text-xs text-ink-soft">
          Create your account here on AU Campus. Sign in on AU Score (or Digest for editions) with
          the same credentials.
        </footer>
      </main>
    </div>
  );
}
