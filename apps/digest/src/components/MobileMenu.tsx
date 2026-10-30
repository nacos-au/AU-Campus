"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { WorldClockStack } from "./WorldClock";
import {
  IconClose,
  IconMenu,
  IconSignOut,
  IconUser,
} from "./icons";
import { site } from "@/lib/site";
import type { Section } from "@/lib/types";

type Props = {
  sections: Section[];
  signedIn: boolean;
  isWriter: boolean;
  adminMode?: boolean;
  signOutAction: () => Promise<void>;
};

export function MobileMenu({
  sections,
  signedIn,
  isWriter,
  adminMode = false,
  signOutAction,
}: Props) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const query = typeof q === "string" ? q.trim() : "";
    setOpen(false);
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`);
    else router.push("/search");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center text-ink"
      >
        <IconMenu className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu backdrop"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setOpen(false)}
          />

          <nav
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-paper shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center"
              >
                <IconClose className="h-6 w-6" />
              </button>
              <p id={titleId} className="font-masthead text-lg font-bold">
                {site.masthead}
              </p>
              <span className="w-10" aria-hidden />
            </div>

            <div className="flex-1 overflow-y-auto">
              <form
                onSubmit={onSearch}
                className="flex gap-2 border-b border-rule px-4 py-3"
              >
                <input
                  name="q"
                  type="search"
                  placeholder="Search"
                  autoFocus
                  className="min-w-0 flex-1 border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-ink px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-paper"
                >
                  Go
                </button>
              </form>

              <ul className="divide-y divide-rule">
                <li>
                  <Link
                    href="/"
                    className="block px-4 py-3.5 font-serif text-lg font-bold"
                  >
                    {t("home")}
                  </Link>
                </li>
                {sections.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/section/${s.slug}`}
                      className="block px-4 py-3.5 font-serif text-lg font-bold"
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/talent"
                    className="block px-4 py-3.5 font-serif text-lg font-bold"
                  >
                    {t("talent")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/forum"
                    className="block px-4 py-3.5 font-serif text-lg font-bold"
                  >
                    {t("forum")}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/editions"
                    className="block px-4 py-3.5 font-serif text-lg font-bold text-accent"
                  >
                    {t("editions")}
                  </Link>
                </li>
              </ul>

              <div className="space-y-4 border-t border-rule px-4 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    {site.university}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-ink-soft">
                    {site.tagline}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    World clocks
                  </p>
                  <WorldClockStack />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                    Language
                  </span>
                  <LanguageSwitcher />
                </div>

                <div className="flex flex-col gap-1 border-t border-rule pt-4">
                  {signedIn ? (
                    <>
                      {isWriter && adminMode && (
                        <Link
                          href="/admin"
                          className="py-2 text-sm font-semibold uppercase tracking-wider"
                        >
                          {t("admin")}
                        </Link>
                      )}
                      <Link
                        href="/account"
                        className="inline-flex items-center gap-2 py-2 text-sm font-semibold uppercase tracking-wider"
                      >
                        <IconUser className="h-4 w-4" />
                        Library
                      </Link>
                      <Link
                        href="/account/settings"
                        className="py-2 text-sm font-semibold uppercase tracking-wider text-ink-soft"
                      >
                        Account settings
                      </Link>
                      <form action={signOutAction}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 py-2 text-sm font-semibold uppercase tracking-wider text-ink-soft"
                        >
                          <IconSignOut className="h-4 w-4" />
                          {t("signOut")}
                        </button>
                      </form>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 py-2 text-sm font-semibold uppercase tracking-wider"
                    >
                      <IconUser className="h-4 w-4" />
                      {t("signIn")}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
