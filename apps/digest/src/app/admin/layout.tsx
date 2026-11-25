import { requireRole, hasRole, canUseAdminMode } from "@/lib/auth";
import { site } from "@/lib/site";
import { digestFeatures } from "@/lib/features";
import { AdminNav, type AdminNavItem } from "@/components/AdminNav";
import { Providers } from "@/components/Providers";
import { leaveNewsroomAction } from "@/app/actions/admin-mode";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("writer");
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");
  const canElevate = canUseAdminMode(profile);
  const deskRole = profile.elevated
    ? `${profile.role} · elevated`
    : (profile.base_role ?? profile.role);

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/articles", label: "Articles", icon: "articles" },
    { href: "/admin/board", label: "Board", icon: "board" },
    ...(staff
      ? ([
          { href: "/admin/front-page", label: "Front page", icon: "editions" },
          { href: "/admin/sections", label: "Sections", icon: "sections" },
          { href: "/admin/weekly", label: "Weekly", icon: "editions" },
          { href: "/admin/facts", label: "Fun facts", icon: "articles" },
          { href: "/admin/words", label: "Words", icon: "articles" },
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
        avatarUrl={profile.avatar_url}
        role={deskRole}
        exitAction={leaveNewsroomAction}
        canElevate={canElevate}
        elevated={Boolean(profile.elevated)}
      >
        {children}
      </AdminNav>
    </Providers>
  );
}
