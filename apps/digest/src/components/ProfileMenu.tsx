"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { IconClose, IconUser } from "./icons";

function firstName(displayName: string, email: string): string {
  const fromName = displayName.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function timeGreeting(): "Good morning" | "Good afternoon" | "Good night" {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good night";
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink/40" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

type Props = {
  email: string;
  displayName: string;
  /** Only shown for Digest admin role */
  showAdminRole: boolean;
  signOutAction: () => Promise<void>;
  /** Staff: show newsroom entry. */
  newsroom?: boolean;
  adminMode?: boolean;
  exitAdminAction?: () => Promise<void>;
  /** Compact icon-only trigger (mobile header) */
  compact?: boolean;
};

const CLOSE_MS = 320;

export function ProfileMenu({
  email,
  displayName,
  showAdminRole,
  signOutAction,
  newsroom = false,
  adminMode = false,
  exitAdminAction,
  compact = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const titleId = useId();
  const greeting = `${timeGreeting()}, ${firstName(displayName, email)}.`;

  function openDrawer() {
    setMounted(true);
  }

  function closeDrawer() {
    setEntered(false);
    window.setTimeout(() => setMounted(false), CLOSE_MS);
  }

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted]);

  return (
    <>
      <button
        type="button"
        onClick={openDrawer}
        aria-expanded={mounted}
        aria-haspopup="dialog"
        aria-label="Open account menu"
        className={
          compact
            ? "flex h-10 w-10 items-center justify-center text-ink"
            : "inline-flex items-center gap-1.5 border border-ink px-3 py-1.5 font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        }
      >
        <IconUser className={compact ? "h-6 w-6" : "h-3.5 w-3.5"} />
        {!compact && (
          <>
            <span>Account</span>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {mounted && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ease-out ${
              entered ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close account menu"
            onClick={closeDrawer}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col bg-paper shadow-2xl transition-transform duration-300 ease-out will-change-transform ${
              entered ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
              <p className="truncate text-[13px] text-ink">{email}</p>
              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-ink"
                aria-label="Close"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8">
              <div className="flex flex-col items-center pt-6 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f0f0] text-ink/50">
                  <IconUser className="h-10 w-10" />
                </span>
                <h2 id={titleId} className="mt-5 font-serif text-[1.75rem] font-bold leading-tight tracking-tight text-ink">
                  {greeting}
                </h2>
                {showAdminRole && (
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                    Admin
                  </p>
                )}
                <Link
                  href="/account/settings"
                  onClick={closeDrawer}
                  className="mt-3 text-[13px] text-[#326891] underline underline-offset-2 hover:text-ink"
                >
                  Edit your profile
                </Link>
              </div>

              <nav className="mt-10">
                <Link
                  href="/account/settings"
                  onClick={closeDrawer}
                  className="flex items-center justify-between border-t border-rule py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Account settings
                  <Chevron />
                </Link>

                {newsroom && (
                  <>
                    <p className="border-t border-rule pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                      Newsroom
                    </p>
                    <Link
                      href="/admin"
                      onClick={closeDrawer}
                      className="flex items-center justify-between py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                    >
                      <span>
                        Open newsroom
                        {adminMode && (
                          <span className="ml-2 bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Admin on
                          </span>
                        )}
                      </span>
                      <Chevron />
                    </Link>
                    {adminMode && exitAdminAction && (
                      <form action={exitAdminAction} className="pb-4">
                        <button
                          type="submit"
                          className="text-[13px] text-accent underline underline-offset-2"
                        >
                          Exit Admin Mode
                        </button>
                      </form>
                    )}
                  </>
                )}

                <p className="border-t border-rule pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                  Your content
                </p>
                <Link
                  href="/account"
                  onClick={closeDrawer}
                  className="flex items-center justify-between py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Library
                  <Chevron />
                </Link>
                <Link
                  href="/account/newsletters"
                  onClick={closeDrawer}
                  className="flex items-center justify-between border-t border-rule py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Newsletters
                  <Chevron />
                </Link>

                <p className="border-t border-rule pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                  Get support
                </p>
                <Link
                  href="/help"
                  onClick={closeDrawer}
                  className="flex items-center justify-between py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Help Center
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0f0f0]">
                    <Chevron />
                  </span>
                </Link>

                <div className="border-t border-rule pt-5">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="text-[15px] text-ink underline underline-offset-2 hover:text-ink-soft"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              </nav>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
