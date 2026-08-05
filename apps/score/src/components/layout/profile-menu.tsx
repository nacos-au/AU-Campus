"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { User, X, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function firstName(displayName: string, email: string): string {
  const fromName = displayName.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email.split("@")[0] ?? "there";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

type Props = {
  email: string;
  displayName: string;
  showAdminRole: boolean;
  signOutAction: () => Promise<void>;
};

/**
 * Score profile drawer — Hello [Name], role for admins, account settings + log out.
 */
export function ProfileMenu({
  email,
  displayName,
  showAdminRole,
  signOutAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const name = firstName(displayName, email);

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
        className="interactive-btn inline-flex items-center gap-1.5 rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold sm:px-4 sm:text-sm"
      >
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Account</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            className="absolute inset-0 bg-accent/30"
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col bg-white shadow-2xl"
            )}
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
              <p className="truncate text-[13px] text-accent/70">{email}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center text-accent"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-8">
              <div className="flex flex-col items-center pt-6 text-center">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface text-accent/40">
                  <User className="h-10 w-10" />
                </span>
                <h2
                  id={titleId}
                  className="mt-5 font-display text-2xl font-extrabold tracking-tight text-accent"
                >
                  Hello {name}
                </h2>
                {showAdminRole && (
                  <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent/60">
                    Admin
                  </p>
                )}
                <Link
                  href="/account/settings"
                  onClick={() => setOpen(false)}
                  className="mt-3 text-[13px] font-semibold text-accent underline underline-offset-2"
                >
                  Edit your profile
                </Link>
              </div>

              <nav className="mt-10">
                <Link
                  href="/account/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-t border-rule py-4 font-display text-[15px] font-bold text-accent hover:bg-surface"
                >
                  Account settings
                  <ChevronRight className="h-4 w-4 opacity-40" />
                </Link>

                <div className="border-t border-rule pt-5">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="font-display text-[15px] font-bold text-accent underline underline-offset-2"
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
