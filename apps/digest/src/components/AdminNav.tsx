"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "./NotificationBell";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

const ICONS = {
  dashboard: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z",
  articles: "M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125",
  sections: "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z",
  editions: "M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25",
  ads: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73",
  talent: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z",
  forum: "M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z",
  team: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
} as const;

function Icon({ name, className = "h-[18px] w-[18px]" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  );
}

function ExitIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
    </svg>
  );
}

export function AdminNav({
  items,
  masthead,
  displayName,
  role,
  exitAction,
  children,
}: {
  items: AdminNavItem[];
  masthead: string;
  displayName: string;
  role: string;
  exitAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navList = (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const active = isActive(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              className={`flex items-center gap-3 rounded-sm px-3 py-2 text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-accent-soft text-accent"
                  : "text-ink-soft hover:bg-gray-50 hover:text-ink"
              }`}
            >
              <Icon name={i.icon} />
              {i.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const userBlock = (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-paper">
        {initials || "·"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{displayName}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{role}</p>
      </div>
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
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-rule bg-paper lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <Image src="/au-logo.webp" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
          <div className="min-w-0">
            <Link href="/" className="block truncate font-masthead text-lg font-bold leading-none">
              {masthead}
            </Link>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              Newsroom
            </p>
          </div>
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
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
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
              <div className="flex items-center gap-2">
                <Image src="/au-logo.webp" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
                <p className="font-masthead text-lg font-bold">{masthead}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none">
                ×
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
