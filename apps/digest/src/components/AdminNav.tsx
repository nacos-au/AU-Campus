"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FilePenLine,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Star,
  Users,
  X,
  BarChart3,
} from "lucide-react";
import { AdminModeToggle } from "./AdminModeToggle";
import { NotificationBell } from "./NotificationBell";
import { ProfileAvatar } from "./ProfileAvatar";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: LayoutDashboard,
  articles: FilePenLine,
  sections: LayoutList,
  editions: BookOpen,
  ads: Megaphone,
  talent: Star,
  forum: MessageCircle,
  comments: MessageCircle,
  team: Users,
  board: BarChart3,
} as const satisfies Record<string, LucideIcon>;

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: keyof typeof ICONS; className?: string }) {
  const Cmp = ICONS[name];
  return <Cmp className={className} strokeWidth={1.75} aria-hidden />;
}

function ExitIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <LogOut className={className} strokeWidth={1.75} aria-hidden />;
}

function NavLinkPendingDot({ show }: { show: boolean }) {
  const { pending } = useLinkStatus();
  if (!show && !pending) return null;
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
      aria-hidden
    />
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
  pendingHref,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  active: boolean;
  pendingHref: string | null;
  onNavigate: (href: string) => void;
}) {
  const pending = pendingHref === href;
  const showActive = active || pending;

  return (
    <Link
      href={href}
      prefetch
      onClick={() => onNavigate(href)}
      aria-current={showActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-sm px-3 py-2 text-[13px] font-semibold transition-colors ${
        showActive
          ? "bg-accent-soft text-accent"
          : "text-ink-soft hover:bg-gray-50 hover:text-ink"
      }`}
    >
      <Icon name={icon} />
      <span className="flex-1">{label}</span>
      {!active ? <NavLinkPendingDot show={pending} /> : null}
    </Link>
  );
}

export function AdminNav({
  items,
  masthead,
  displayName,
  avatarUrl = null,
  role,
  exitAction,
  canElevate = false,
  elevated = false,
  children,
}: {
  items: AdminNavItem[];
  masthead: string;
  displayName: string;
  avatarUrl?: string | null;
  role: string;
  exitAction: () => Promise<void>;
  canElevate?: boolean;
  elevated?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOpen(false);
    setPendingHref(null);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  function onNavigate(href: string) {
    if (isActive(href)) return;
    startTransition(() => setPendingHref(href));
  }

  const navList = (
    <ul className="space-y-0.5">
      {items.map((i) => (
        <li key={i.href}>
          <NavLink
            href={i.href}
            label={i.label}
            icon={i.icon}
            active={isActive(i.href)}
            pendingHref={pendingHref}
            onNavigate={onNavigate}
          />
        </li>
      ))}
    </ul>
  );

  const userBlock = (
    <div className="space-y-3">
      {canElevate && (
        <div className="flex justify-start">
          <AdminModeToggle canUse={canElevate} active={elevated} />
        </div>
      )}
      <div className="flex items-center gap-3">
        <Link
          href="/account/settings"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm py-1 hover:bg-gray-50"
          title="Edit profile"
        >
          <ProfileAvatar url={avatarUrl} name={displayName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{displayName}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
              {role}
            </p>
          </div>
        </Link>
        <form action={exitAction}>
          <button
            type="submit"
            title="Exit newsroom"
            aria-label="Exit newsroom"
            className="flex h-8 w-8 items-center justify-center rounded-sm text-ink-soft hover:bg-gray-100 hover:text-accent"
          >
            <ExitIcon />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule bg-paper lg:flex">
        <div className="px-5 pb-4 pt-5">
          <Link href="/" className="block truncate font-masthead text-lg font-bold leading-none">
            {masthead}
          </Link>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            Newsroom
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3">{navList}</nav>
        <div className="border-t border-rule px-4 py-4">{userBlock}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-2 border-b border-rule bg-paper px-2 py-1.5 lg:px-8 lg:py-2.5">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center lg:hidden"
          >
            <Menu className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2 lg:justify-start">
            <span className="truncate font-masthead text-lg font-bold lg:hidden">{masthead}</span>
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft lg:inline">
              {items.find((i) => isActive(i.href))?.label ?? "Newsroom"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className="hidden px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-soft hover:text-ink lg:inline"
            >
              View paper
            </Link>
            <NotificationBell />
            <form action={exitAction} className="lg:hidden">
              <button
                type="submit"
                title="Exit newsroom"
                aria-label="Exit newsroom"
                className="flex h-10 w-10 items-center justify-center text-ink hover:text-accent"
              >
                <ExitIcon />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-paper shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-masthead text-lg font-bold">{masthead}</p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center text-ink">
                <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pt-2">
              {navList}
              <Link href="/" className="mt-3 flex items-center gap-3 px-3 py-2 text-[13px] font-semibold text-ink-soft">
                ← View the paper
              </Link>
            </div>
            <div className="border-t border-rule px-4 py-4">{userBlock}</div>
          </nav>
        </div>
      )}
    </div>
  );
}
