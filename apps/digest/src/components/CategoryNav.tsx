"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  accent?: boolean;
}

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** Desktop categories row — the current page is highlighted in the brand color. */
export function CategoryNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections">
      <ul className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2.5 text-[13px] font-semibold">
        {items.map((i) => {
          const active = isActivePath(pathname, i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap transition-colors ${
                  active
                    ? "font-bold text-accent"
                    : i.accent
                      ? "text-accent/80 hover:text-accent"
                      : "hover:text-accent"
                }`}
              >
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
