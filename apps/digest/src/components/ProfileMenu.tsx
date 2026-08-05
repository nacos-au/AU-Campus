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
  /** Compact icon-only trigger (mobile header) */
  compact?: boolean;
};

export function ProfileMenu({
  email,
  displayName,
  showAdminRole,
  signOutAction,
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const greeting = `${timeGreeting()}, ${firstName(displayName, email)}.`;

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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open account menu"
        className={
          compact
            ? "flex h-10 w-10 items-center justify-center text-ink"
            : "inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-ink-soft transition-colors hover:text-ink"
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

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-ink/25"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col bg-paper shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
              <p className="truncate text-[13px] text-ink">{email}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className="mt-3 text-[13px] text-[#326891] underline underline-offset-2 hover:text-ink"
                >
                  Edit your profile
                </Link>
              </div>

              <nav className="mt-10">
                <Link
                  href="/account/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-t border-rule py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Account settings
                  <Chevron />
                </Link>

                <p className="border-t border-rule pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
                  Your content
                </p>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-4 text-[15px] text-ink hover:bg-accent-soft/40"
                >
                  Library
                  <Chevron />
                </Link>
                <Link
                  href="/account/newsletters"
                  onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
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
