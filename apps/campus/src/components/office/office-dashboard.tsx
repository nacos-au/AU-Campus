import Link from "next/link";
import { DIGEST_URL, SCORE_URL } from "@/lib/urls";
import {
  getOfficeStats,
  listRecentUsers,
  listStaffRoster,
} from "@/app/actions/office";
import { ExitOfficeButton } from "@/components/office/office-mode-controls";
import { OfficeDirectory } from "@/components/office/office-directory";
import type { CampusStaff } from "@/lib/platform-roles";

export async function OfficeDashboard({ staff }: { staff: CampusStaff }) {
  const [stats, recent, roster] = await Promise.all([
    getOfficeStats(),
    listRecentUsers(),
    listStaffRoster(),
  ]);

  const launches = [
    {
      href: `${SCORE_URL}/admin`,
      eyebrow: "Sports",
      title: "Score Admin",
      body: "Competitions, venues, awards, live ops",
      tip: "Sign in on Score → Admin Mode → Admin",
      tone: "green" as const,
    },
    {
      href: `${DIGEST_URL}/admin`,
      eyebrow: "News",
      title: "Digest Newsroom",
      body: "Articles, editions, team, revenue",
      tip: "Sign in on Digest → Admin Mode → Newsroom",
      tone: "accent" as const,
    },
    {
      href: SCORE_URL,
      eyebrow: "Public",
      title: "AU Score",
      body: "Open the live sports site",
      tip: null,
      tone: "ink" as const,
    },
    {
      href: DIGEST_URL,
      eyebrow: "Public",
      title: "AU Digest",
      body: "Open the campus paper",
      tip: null,
      tone: "ink" as const,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
            Super admin · Campus Office
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Command centre
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/65">
            Grant roles in one tap. Launch Score & Digest admin desks. You are signed in as{" "}
            <span className="font-semibold text-white">
              {staff.username ? `@${staff.username}` : staff.email}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10"
          >
            Campus home
          </Link>
          <ExitOfficeButton />
        </div>
      </div>

      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "Users", value: stats.users },
            { label: "L1 soft", value: stats.soft },
            { label: "L2 verified", value: stats.verified },
            { label: "Score admin", value: stats.scoreAdmins },
            { label: "Keepers", value: stats.scoreKeepers },
            { label: "Digest admin", value: stats.digestAdmins },
            { label: "Campus admin", value: stats.campusAdmins },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">
                {s.label}
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-display text-sm font-extrabold text-white">Launch</h2>
        <p className="mt-1 text-xs text-white/50">
          Sessions are per-app today — open the desk, sign in with the same account, turn on Admin
          Mode.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {launches.map((item) => (
            <a
              key={item.href + item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="group rounded-2xl border border-white/12 bg-white/[0.07] p-4 transition hover:border-white/30 hover:bg-white/12"
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  item.tone === "green"
                    ? "text-green-bright"
                    : item.tone === "accent"
                      ? "text-[#e8a0a8]"
                      : "text-white/45"
                }`}
              >
                {item.eyebrow}
              </p>
              <h3 className="mt-1 font-display text-lg font-extrabold text-white">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-white/55">{item.body}</p>
              {item.tip && (
                <p className="mt-3 text-[10px] leading-snug text-white/40">{item.tip}</p>
              )}
              <span className="mt-3 inline-block text-xs font-bold text-white group-hover:underline">
                Open →
              </span>
            </a>
          ))}
        </div>
      </section>

      <div className="mt-10">
        <OfficeDirectory
          initialRecent={recent}
          initialStaff={roster}
          selfId={staff.userId}
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-white/35">
        Office Mode expires in ~12 hours. Role changes apply immediately to the shared Supabase
        project.
      </p>
    </div>
  );
}
