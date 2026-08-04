"use client";

import Link from "next/link";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { AdminAwardsManager } from "@/components/admin/admin-awards-manager";
import { AdminCompetitionWizard } from "@/components/admin/admin-competition-wizard";
import { AdminGuestTeamManager } from "@/components/admin/admin-guest-team-manager";
import { AdminMatchManager } from "@/components/admin/admin-match-manager";
import { AdminPostResultTool } from "@/components/admin/admin-post-result-tool";
import { AdminVenueManager } from "@/components/admin/admin-venue-manager";
import { DEMO_DEPARTMENTS, DEMO_SPORTS, DEMO_TEAMS } from "@/lib/data/demo";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-6">
      <p className="text-sm opacity-70">
        Admin tools for venues, guest opponents, manual results, and match edits.
        Match posting is also available to record keepers. Production writes go to Supabase;
        demo mode uses a session overlay so you can verify flows locally.
      </p>

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

      <AdminCompetitionWizard />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminVenueManager />
        <AdminGuestTeamManager />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPostResultTool />
        <AdminMatchManager />
      </div>

      <AdminAwardsManager />

      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { title: "Departments", items: DEMO_DEPARTMENTS.map((d) => d.name) },
          { title: "Sports", items: DEMO_SPORTS.map((s) => s.name) },
          { title: "Teams", items: DEMO_TEAMS.slice(0, 8).map((t) => t.name) },
        ].map((card) => (
          <div key={card.title} className="table-card p-5">
            <h2 className="font-display font-extrabold">{card.title}</h2>
            <ul className="mt-3 space-y-1 text-sm opacity-80">
              {card.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

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
