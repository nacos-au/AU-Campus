"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Handshake,
  LayoutGrid,
  MessageSquare,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import type { SessionStaff } from "@/lib/auth/roles";
import { cn } from "@/lib/utils/cn";

type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  /** Admin-only technical tools */
  adminOnly?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Hub", icon: LayoutGrid, exact: true },
  { href: "/admin/clubs", label: "Clubs", icon: UsersRound, adminOnly: true },
  { href: "/admin/players", label: "Players", icon: Users },
  { href: "/admin/competitions", label: "Competitions", icon: Trophy },
  { href: "/admin/fixtures", label: "Fixtures", icon: CalendarClock, adminOnly: true },
  { href: "/admin/matches", label: "Matches", icon: Handshake },
  { href: "/admin/lineups", label: "Lineups", icon: ClipboardCheck },
  { href: "/admin/awards", label: "Awards", icon: Trophy },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, adminOnly: true },
];

function visibleNav(staff: SessionStaff | null | undefined): AdminNavItem[] {
  if (!staff) return ADMIN_NAV.filter((i) => !i.adminOnly);
  if (staff.isAdmin) return ADMIN_NAV;
  return ADMIN_NAV.filter((i) => !i.adminOnly);
}

export function AdminSubNav({ staff }: { staff?: SessionStaff | null }) {
  const pathname = usePathname();
  const items = visibleNav(staff);

  return (
    <nav className="border-b border-rule bg-wrapper">
      <div className="hide-scrollbar mx-auto flex max-w-[1200px] gap-1 overflow-x-auto px-3 py-2 sm:gap-2 sm:px-6">
        {items.map(({ href, label, icon: Icon, ...rest }) => {
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

export function AdminHubCards({ staff }: { staff?: SessionStaff | null }) {
  const isAdmin = Boolean(staff?.isAdmin ?? true);
  const cards = [
    ...(isAdmin
      ? [
          {
            href: "/admin/clubs",
            icon: UsersRound,
            title: "Clubs",
            body: "Add AU sides and guest opponents, then attach logos.",
            cta: "Manage clubs",
          },
        ]
      : []),
    {
      href: "/admin/players",
      icon: Users,
      title: "Players",
      body: isAdmin
        ? "Register athletes into an unlimited club pool — name first, photos later."
        : "Search and correct player names, matric, and positions.",
      cta: isAdmin ? "Manage players" : "Edit players",
    },
    {
      href: "/admin/competitions",
      icon: Trophy,
      title: isAdmin ? "Competitions" : "Competition squads",
      body: isAdmin
        ? "Publish a comp, set squad caps, then fill each club’s competition squad."
        : "Pick players from each club pool onto the named competition squad.",
      cta: isAdmin ? "Create competition" : "Fill squads",
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/fixtures",
            icon: CalendarClock,
            title: "Fixtures",
            body: "Postpone or move matches. Edit one date, or shift a batch by days. Every change is logged.",
            cta: "Manage fixtures",
          },
        ]
      : []),
    {
      href: "/admin/lineups",
      icon: ClipboardCheck,
      title: "Lineup approvals",
      body: "Review starting XIs sent by team reps through their private links. Nothing goes live until you approve it.",
      cta: "Review XIs",
    },
    {
      href: "/admin/matches",
      icon: CalendarDays,
      title: "Matches",
      body: "Reconcile past results, friendlies, scorers, assists, and match edits.",
      cta: "Open matches",
    },
    {
      href: "/admin/awards",
      icon: Trophy,
      title: "Season awards",
      body: "Publish Golden Boot, POTS, TOTW with real players — drafts stay private until published.",
      cta: "Manage awards",
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/feedback",
            icon: MessageSquare,
            title: "Feedback",
            body: "Read bug reports and ideas submitted from the public app.",
            cta: "Open feedback",
          },
        ]
      : []),
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
