import { requireRole, hasRole } from "@/lib/auth";
import { site } from "@/lib/site";
import { digestFeatures } from "@/lib/features";
import { AdminNav, type AdminNavItem } from "@/components/AdminNav";
import { Providers } from "@/components/Providers";
import { exitAdminModeAction } from "@/app/actions/admin-mode";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("writer");
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/articles", label: "Articles", icon: "articles" },
    ...(staff
      ? ([
          { href: "/admin/sections", label: "Sections", icon: "sections" },
          { href: "/admin/weekly", label: "Weekly", icon: "editions" },
          ...(digestFeatures.manualAds
            ? ([{ href: "/admin/ads", label: "Advertising", icon: "ads" }] as AdminNavItem[])
            : []),
        ] as AdminNavItem[])
      : []),
    ...(isAdmin ? ([{ href: "/admin/team", label: "Team", icon: "team" }] as AdminNavItem[]) : []),
  ];

  return (
    <Providers>
      <AdminNav
        items={items}
        masthead={site.masthead}
        displayName={profile.display_name}
        role={profile.role}
        exitAction={exitAdminModeAction}
      >
        {children}
      </AdminNav>
    </Providers>
  );
}
