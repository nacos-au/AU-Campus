"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Handshake,
  LayoutGrid,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const ADMIN_NAV = [
  { href: "/admin", label: "Hub", icon: LayoutGrid, exact: true },
  { href: "/admin/clubs", label: "Clubs", icon: UsersRound },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/competitions", label: "Competitions", icon: Trophy },
  { href: "/admin/matches", label: "Matches", icon: Handshake },
] as const;

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-rule bg-wrapper">
      <div className="hide-scrollbar mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-6">
        {ADMIN_NAV.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-display text-sm font-bold transition",
                active
                  ? "btn-filled text-white"
                  : "text-accent/70 hover:bg-white hover:text-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminHubCards() {
  const cards = [
    {
      href: "/admin/clubs",
      icon: UsersRound,
      title: "Clubs",
      body: "Add AU sides and guest opponents, then attach logos.",
      cta: "Manage clubs",
    },
    {
      href: "/admin/players",
      icon: Users,
      title: "Players",
      body: "Register athletes into an unlimited club pool — name first, photos later.",
      cta: "Manage players",
    },
    {
      href: "/admin/competitions",
      icon: Trophy,
      title: "Competitions",
      body: "Publish a comp, set squad caps, then fill each club’s competition squad.",
      cta: "Create competition",
    },
    {
      href: "/admin/matches",
      icon: CalendarDays,
      title: "Matches",
      body: "Friendlies, manual results, venues, and match edits.",
      cta: "Open matches",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map(({ href, icon: Icon, title, body, cta }) => (
        <Link
          key={href}
          href={href}
          className="table-card group flex flex-col gap-4 p-6 transition hover:shadow-md"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/[0.08] text-accent">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-accent/70">{body}</p>
          </div>
          <span className="font-display text-sm font-bold text-accent group-hover:underline">
            {cta} →
          </span>
        </Link>
      ))}
    </div>
  );
}
