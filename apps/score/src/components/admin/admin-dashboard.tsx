"use client";

import Link from "next/link";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminAwardsManager } from "@/components/admin/admin-awards-manager";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminGuestTeamManager } from "@/components/admin/admin-guest-team-manager";
import { AdminKeeperCalendar } from "@/components/admin/admin-keeper-calendar";
import { AdminMatchManager } from "@/components/admin/admin-match-manager";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { AdminRosterImport } from "@/components/admin/admin-roster-import";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-6">
      <p className="text-sm opacity-70">
        Season setup runs top to bottom. Paste teams and players in from a list, publish a league or
        cup from the sides that exist in that sport, then keepers open those fixtures and fill them
        in. Friendlies and one-off matches stay here with admins.
      </p>

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          { n: "1", title: "Onboard", body: "Paste teams, then players — comma, colon, space or dot." },
          { n: "2", title: "Compete", body: "Create a league or cup from the teams in that sport." },
          { n: "3", title: "Keep score", body: "Keepers fill competition fixtures. You handle friendlies." },
        ].map((s) => (
          <li key={s.n} className="rounded-2xl border border-rule bg-white px-4 py-3">
            <p className="font-display text-[11px] font-bold uppercase tracking-wide text-accent/50">
              Step {s.n}
            </p>
            <p className="font-display font-extrabold">{s.title}</p>
            <p className="mt-0.5 text-sm opacity-70">{s.body}</p>
          </li>
        ))}
      </ol>

      <AdminRosterImport />

      <AdminCompetitionWizard />

      <AdminKeeperCalendar />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="table-card p-6">
          <h2 className="font-display text-lg font-extrabold">Club Logo</h2>
          <div className="mt-4">
            <ImageUploadField
              label="Upload club logo"
              hint="PNG, JPEG, or WebP · max 2MB · square recommended"
              fallbackCode="CSC"
            />
          </div>
        </div>
        <div className="table-card p-6">
          <h2 className="font-display text-lg font-extrabold">Player Photo</h2>
          <div className="mt-4">
            <ImageUploadField
              label="Upload player avatar"
              hint="PNG, JPEG, or WebP · max 2MB"
              fallbackCode="AO"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminVenueManager />
        <AdminGuestTeamManager />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPostResultTool />
        <AdminMatchManager />
      </div>

      <AdminAwardsManager />

      <div className="flex flex-wrap gap-3">
        <Link href="/demo" className="rounded-lg border border-accent px-4 py-2 font-display text-sm font-bold text-accent">
          All demo links
        </Link>
        <Link href="/competition?sport=football" className="rounded-lg border border-rule px-4 py-2 font-display text-sm font-bold">
          Competition timeline
        </Link>
      </div>
    </div>
  );
}
