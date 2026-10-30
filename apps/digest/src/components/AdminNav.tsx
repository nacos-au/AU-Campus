"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "./NotificationBell";

interface NavItem {
  href: string;
  label: string;
}

export function AdminNav({
  items,
  masthead,
  displayName,
  role,
  exitAdminModeAction,
  signOutAction,
}: {
  items: NavItem[];
  masthead: string;
  displayName: string;
  role: string;
  exitAdminModeAction: () => Promise<void>;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 bg-paper lg:static">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-2 py-1 lg:px-4 lg:py-3">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
            <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 lg:flex-none lg:justify-start">
          <Link href="/" className="truncate font-masthead text-xl font-bold lg:text-2xl">
            {masthead}
          </Link>
          <span className="hidden bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper sm:inline">
            Newsroom
          </span>
        </div>

        <nav className="ml-6 hidden flex-1 items-center gap-5 text-[13px] font-semibold lg:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={
                isActive(i.href)
                  ? "text-accent underline underline-offset-8"
                  : "hover:text-accent"
              }
            >
              {i.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <NotificationBell />
          <span className="hidden text-[13px] text-ink-soft lg:inline">
            {displayName}{" "}
            <span className="text-[10px] uppercase tracking-wide">({role})</span>
          </span>
          <form action={exitAdminModeAction} className="hidden lg:block">
            <button className="text-[13px] font-semibold text-accent hover:underline" type="submit">
              Exit Admin Mode
            </button>
          </form>
          <form action={signOutAction} className="hidden lg:block">
            <button className="text-[13px] text-ink-soft hover:text-ink">Sign out</button>
          </form>
        </div>
      </div>

      {/* Mobile bottom-less drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-paper shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-masthead text-lg font-bold">{masthead}</p>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none">
                ×
              </button>
            </div>
            <p className="px-4 pb-3 text-xs text-ink-soft">
              {displayName} · <span className="uppercase">{role}</span>
            </p>
            <ul className="flex-1 overflow-y-auto border-t border-rule">
              {items.map((i) => (
                <li key={i.href} className="border-b border-rule">
                  <Link
                    href={i.href}
                    className={`block px-4 py-3.5 font-serif text-lg font-bold ${
                      isActive(i.href) ? "text-accent" : ""
                    }`}
                  >
                    {i.label}
                  </Link>
                </li>
              ))}
              <li className="border-b border-rule">
                <Link href="/" className="block px-4 py-3.5 text-sm font-semibold text-ink-soft">
                  ← Back to the paper
                </Link>
              </li>
            </ul>
            <div className="flex flex-col gap-1 border-t border-rule px-4 py-4">
              <form action={exitAdminModeAction}>
                <button className="py-2 text-sm font-semibold text-accent" type="submit">
                  Exit Admin Mode
                </button>
              </form>
              <form action={signOutAction}>
                <button className="py-2 text-sm text-ink-soft">Sign out</button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
