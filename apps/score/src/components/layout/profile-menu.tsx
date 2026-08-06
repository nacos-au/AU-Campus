"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { User, X, ChevronRight, ChevronDown, Settings } from "lucide-react";
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

const CLOSE_MS = 320;

/**
 * Score profile drawer — slides in from the right over a green wash (PL-style).
 */
export function ProfileMenu({
  email,
  displayName,
  showAdminRole,
  signOutAction,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const titleId = useId();
  const name = firstName(displayName, email);

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
        className="interactive-btn inline-flex items-center gap-1.5 rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold sm:px-4 sm:text-sm"
      >
        <User className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Account</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      {mounted && (
        <div className="fixed inset-0 z-[80]">
          {/* Green atmospheric overlay (PL purple → AU green) */}
          <button
            type="button"
            aria-label="Close account menu"
            onClick={closeDrawer}
            className={cn(
              "absolute inset-0 transition-opacity duration-300 ease-out",
              entered ? "opacity-100" : "opacity-0"
            )}
            style={{
              background:
                "linear-gradient(115deg, rgba(0,31,16,0.72) 0%, rgba(0,78,40,0.58) 45%, rgba(0,100,55,0.52) 100%)",
              backdropFilter: "blur(2px)",
            }}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute right-3 top-3 bottom-3 flex w-[min(400px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-3xl bg-[#f4f4f4] shadow-2xl transition-transform duration-300 ease-out will-change-transform",
              entered ? "translate-x-0" : "translate-x-[110%]"
            )}
          >
            {/* Dark header + green glow */}
            <div className="relative isolate overflow-hidden bg-[#00150c] px-5 pb-8 pt-4 text-white">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 80% at 85% -10%, rgba(0,200,83,0.55), transparent 70%), radial-gradient(ellipse 60% 50% at 20% 0%, rgba(0,78,40,0.45), transparent 65%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(0,78,40,0.35) 35%, rgba(0,200,83,0.85) 100%)",
                  filter: "blur(14px)",
                  transform: "translateY(40%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]"
                style={{
                  background:
                    "linear-gradient(90deg, #003d20 0%, #007842 45%, #00e676 100%)",
                }}
                aria-hidden
              />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <p className="truncate text-[12px] text-white/55">{email}</p>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="relative z-10 mt-8 text-center">
                <h2
                  id={titleId}
                  className="font-display text-[1.85rem] font-extrabold tracking-tight text-white"
                >
                  Hello {name}
                </h2>
                <p className="mt-1.5 text-sm text-white/70">
                  {showAdminRole ? "Admin · AU Score" : "AU Score account"}
                </p>

                <Link
                  href="/account/settings"
                  onClick={closeDrawer}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 font-display text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/18"
                >
                  <Settings className="h-4 w-4" />
                  Account settings
                </Link>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <Link
                  href="/account/settings"
                  onClick={closeDrawer}
                  className="flex items-center justify-between px-4 py-4 font-display text-[15px] font-bold text-accent transition hover:bg-surface"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-accent/50">
                      <User className="h-4 w-4" />
                    </span>
                    Edit profile
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-40" />
                </Link>
              </div>

              <div className="mt-auto flex justify-center border-t border-rule pt-5">
                <form action={signOutAction} className="w-full max-w-[240px]">
                  <button
                    type="submit"
                    className="w-full rounded-full border-2 border-accent bg-white px-5 py-2.5 font-display text-sm font-extrabold text-accent transition hover:bg-accent hover:text-white"
                  >
                    Log out of AU Score
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
