import { requireRole, hasRole } from "@/lib/auth";
import { site } from "@/lib/site";
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
          { href: "/admin/editions", label: "Editions", icon: "editions" },
          { href: "/admin/ads", label: "Advertising", icon: "ads" },
          { href: "/admin/talent", label: "Talent", icon: "talent" },
          { href: "/admin/forum", label: "Forum", icon: "forum" },
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
