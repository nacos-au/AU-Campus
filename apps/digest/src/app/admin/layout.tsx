import { requireRole } from "@/lib/auth";
import { hasRole } from "@/lib/auth";
import { site } from "@/lib/site";
import { AdminNav } from "@/components/AdminNav";
import { Providers } from "@/components/Providers";
import { signOut } from "@/app/(auth)/actions";
import { exitAdminModeAction } from "@/app/actions/admin-mode";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("writer");
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");

  const items = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/articles", label: "Articles" },
    ...(staff
      ? [
          { href: "/admin/sections", label: "Sections" },
          { href: "/admin/editions", label: "Editions" },
          { href: "/admin/ads", label: "Ads" },
          { href: "/admin/talent", label: "Talent" },
          { href: "/admin/forum", label: "Forum" },
        ]
      : []),
    ...(isAdmin ? [{ href: "/admin/team", label: "Team" }] : []),
  ];

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <div className="bg-accent px-3 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white sm:py-2 sm:text-[11px]">
          Admin Mode <span className="hidden sm:inline">— you are editing live Digest content</span>
        </div>
        <AdminNav
          items={items}
          masthead={site.masthead}
          displayName={profile.display_name}
          role={profile.role}
          exitAdminModeAction={exitAdminModeAction}
          signOutAction={signOut}
        />
        <div className="mx-auto h-px w-full max-w-7xl bg-rule-dark" />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </Providers>
  );
}
