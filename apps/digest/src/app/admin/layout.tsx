import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { hasRole } from "@/lib/auth";
import { site } from "@/lib/site";
import { Providers } from "@/components/Providers";
import { signOut } from "@/app/(auth)/actions";
import { exitAdminModeAction, isAdminModeActive } from "@/app/actions/admin-mode";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("writer");
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");
  const adminMode = await isAdminModeActive();

  if (!adminMode) {
    redirect("/?admin_mode=required");
  }

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <div className="border-b border-accent bg-accent px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-white">
          Admin Mode — you are editing live Digest content
        </div>
        <header className="border-b border-rule-dark bg-paper">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-masthead text-2xl font-bold">
                {site.masthead}
              </Link>
              <span className="bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper">
                Newsroom
              </span>
            </div>
            <nav className="flex flex-wrap items-center gap-4 text-[13px] font-semibold sm:gap-5">
              <Link href="/admin" className="hover:text-accent">
                Dashboard
              </Link>
              <Link href="/admin/articles" className="hover:text-accent">
                Articles
              </Link>
              {staff && (
                <>
                  <Link href="/admin/sections" className="hover:text-accent">
                    Sections
                  </Link>
                  <Link href="/admin/editions" className="hover:text-accent">
                    Editions
                  </Link>
                  <Link href="/admin/ads" className="hover:text-accent">
                    Ads
                  </Link>
                  <Link href="/admin/talent" className="hover:text-accent">
                    Talent
                  </Link>
                  <Link href="/admin/forum" className="hover:text-accent">
                    Forum
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin/team" className="hover:text-accent">
                  Team
                </Link>
              )}
              <span className="text-ink-soft">
                {profile.display_name}{" "}
                <span className="uppercase text-[10px] tracking-wide">
                  ({profile.role})
                </span>
              </span>
              <form action={exitAdminModeAction}>
                <button className="text-accent hover:underline" type="submit">
                  Exit Admin Mode
                </button>
              </form>
              <form action={signOut}>
                <button className="text-ink-soft hover:text-ink">
                  Sign out
                </button>
              </form>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
          {children}
        </main>
      </div>
    </Providers>
  );
}
