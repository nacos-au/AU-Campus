import Link from "next/link";
import { BrandedSection } from "@/components/layout/branded-section";
import { PageContent } from "@/components/layout/page-content";
import { DEMO_MATCHES } from "@/lib/data/demo";
import { SPORT_LABELS, type SportId } from "@/lib/utils/sport";

export const metadata = { title: "Demo Links" };

const SPORTS: SportId[] = ["football", "basketball", "tennis", "volleyball", "track"];

const STATIC_PAGES = [
  { href: "/", label: "Matches (home)", note: "Per sport via ?sport=" },
  { href: "/standings", label: "Standings / Table" },
  { href: "/stats", label: "Stats Centre" },
  { href: "/stats/players", label: "Player Stats Rankings" },
  { href: "/teams", label: "Clubs / Teams / Athletes" },
  { href: "/competition", label: "Competition Timeline & Bracket" },
  { href: "/keeper", label: "Record Keeper (sport picker)" },
  { href: "/admin", label: "Admin Dashboard" },
  { href: "/?auth=signin", label: "Sign In (modal)" },
];

const FEATURED_MATCHES = [
  { id: "match-1", sport: "football", label: "Football live — goals with team crests" },
  { id: "match-15", sport: "football", label: "Football cup QF — extra time + penalties" },
  { id: "match-4", sport: "basketball", label: "Basketball live — quarter scores" },
  { id: "match-7", sport: "tennis", label: "Tennis singles live — set scores" },
  { id: "match-16", sport: "tennis", label: "Tennis doubles completed" },
  { id: "match-12", sport: "volleyball", label: "Volleyball live — set breakdown" },
  { id: "match-10", sport: "track", label: "Track 100m final — finish times" },
];

export default function DemoPage() {
  return (
    <>
      <BrandedSection title="Demo Preview Links" activeSport="football" />
      <PageContent>
        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-8 sm:px-6">
          <p className="text-sm opacity-70">
            No account required. Ensure <strong>Demo mode</strong> is on in the header. All links open with sample data.
            Record keeper logs are stored in your browser only — they do not update the public match pages yet.
          </p>

          <section className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4 text-sm">
            <p className="font-display font-bold text-accent">Sport director demo flow (suggested)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 opacity-90">
              <li>Start at <strong>/demo</strong> — use Featured Matches below.</li>
              <li>Football: live match + cup QF (penalties) + Competition bracket.</li>
              <li>Record Keeper: try each sport tab — logs are removable with ✕.</li>
              <li>Competition tab is richest for <strong>football</strong> and <strong>tennis</strong> only.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold">Main Pages</h2>
            <ul className="table-card divide-y divide-rule">
              {STATIC_PAGES.map((page) => (
                <li key={page.href}>
                  <Link href={`${page.href}?sport=football`} className="flex flex-col gap-0.5 px-5 py-4 hover:bg-wrapper sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-display font-bold">{page.label}</span>
                    <span className="font-mono text-xs opacity-50">{page.href}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold">By Sport</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SPORTS.map((sport) => (
                <div key={sport} className="table-card p-5">
                  <h3 className="font-display font-extrabold">{SPORT_LABELS[sport]}</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {["/", "/standings", "/stats", "/teams", "/competition", "/keeper"].map((path) => (
                      <li key={path}>
                        <Link href={`${path}?sport=${sport}`} className="font-semibold text-accent hover:underline">
                          {path === "/" ? "Matches" : path === "/keeper" ? "Record Keeper" : path.slice(1)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold">Featured Matches</h2>
            <ul className="table-card divide-y divide-rule">
              {FEATURED_MATCHES.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/matches/${m.id}?sport=${m.sport}`}
                    className="flex flex-col gap-1 px-5 py-4 hover:bg-wrapper sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-display font-bold">{m.label}</span>
                    <span className="font-mono text-xs opacity-50">/matches/{m.id}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-display text-xl font-extrabold">Sample Clubs & Players</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/teams/team-csc-fc?sport=football" className="table-card px-5 py-4 hover:bg-wrapper">
                <p className="font-display font-bold">CSC FC (football club)</p>
              </Link>
              <Link href="/players/pl-1?sport=football" className="table-card px-5 py-4 hover:bg-wrapper">
                <p className="font-display font-bold">Adaeze Okonkwo (player profile)</p>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-display text-sm font-extrabold uppercase opacity-60">All demo matches</h2>
            <p className="mb-3 text-xs opacity-50">{DEMO_MATCHES.length} fixtures in dataset</p>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {DEMO_MATCHES.map((m) => {
                const sport = m.sport_id.replace("sport-", "");
                return (
                  <li key={m.id}>
                    <Link
                      href={`/matches/${m.id}?sport=${sport}`}
                      className="block rounded-lg border border-rule px-3 py-2 text-sm hover:bg-wrapper"
                    >
                      <span className="font-semibold">{m.id}</span>
                      <span className="opacity-50"> · {sport} · {m.status}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </PageContent>
    </>
  );
}
