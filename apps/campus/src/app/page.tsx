import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { DIGEST_URL, SCORE_URL } from "@/lib/urls";

const apps = [
  {
    name: "AU Digest",
    description: "Campus newspaper — articles, editions, and the newsroom.",
    href: DIGEST_URL,
    accent: "border-[#1a1a1a] bg-white",
    tag: "News",
  },
  {
    name: "AU Score",
    description: "Live matches, league tables, stats, and club profiles.",
    href: SCORE_URL,
    accent: "border-[#004e28] bg-white",
    tag: "Sports",
  },
] as const;

export default function CampusHomePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[960px] flex-col px-4 py-10 sm:px-6 sm:py-16">
      <SiteHeader />

      <div className="mb-8 text-center sm:mb-12">
        <p className="mx-auto max-w-md text-sm opacity-70 sm:text-base">
          One front door for student utilities. Pick an app below — same account across
          everything once Supabase is connected.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            className={`group rounded-2xl border-2 p-6 shadow-sm transition hover:shadow-md ${app.accent}`}
          >
            <span className="text-xs font-bold uppercase tracking-wide opacity-50">
              {app.tag}
            </span>
            <h2 className="mt-2 text-xl font-bold">{app.name}</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-70">{app.description}</p>
            <span className="mt-4 inline-block text-sm font-semibold group-hover:underline">
              Open app →
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-auto pt-16 text-center text-xs opacity-50">
        <p>
          Dev: Campus <code className="rounded bg-white px-1">:3000</code> · Digest{" "}
          <code className="rounded bg-white px-1">:3001</code> · Score{" "}
          <code className="rounded bg-white px-1">:3002</code>
        </p>
        <p className="mt-2">
          Run all: <code className="rounded bg-white px-1">npm run dev</code> from repo root
        </p>
      </footer>
    </div>
  );
}
