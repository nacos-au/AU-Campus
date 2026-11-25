import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { ProfileSettingsForm } from "../profile-settings-form";
import { ProfilePhotoSection } from "../profile-photo-section";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login?next=/account/settings");

  const isAdmin = hasRole(profile, "admin");
  const canEditPhoto = hasRole(profile, "writer");

  return (
    <div className="mx-auto max-w-3xl py-8">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <Link href="/account" className="hover:text-ink">
            Account
          </Link>{" "}
          / Settings
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold">Account settings</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {profile?.username ? `@${profile.username}` : profile?.display_name || user.email}
          {isAdmin && (
            <>
              {" "}
              · <span className="uppercase tracking-wide">Admin</span>
            </>
          )}
        </p>
      </header>

      {canEditPhoto && (
        <ProfilePhotoSection
          userId={user.id}
          displayName={profile?.display_name ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
        />
      )}

      <ProfileSettingsForm
        displayName={profile?.display_name ?? ""}
        username={profile?.username ?? ""}
        email={user.email}
        bio={profile?.bio ?? ""}
      />
    </div>
  );
}
