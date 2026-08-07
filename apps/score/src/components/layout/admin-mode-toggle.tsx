"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { setAdminMode } from "@/app/actions/admin-mode";
import { cn } from "@/lib/utils/cn";

/**
 * Visible only to campus admins. Normal browsing stays non-admin until they
 * explicitly confirm entering Admin Mode.
 */
export function AdminModeToggle({
  canUse,
  active,
}: {
  canUse: boolean;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!canUse) return null;

  function toggle() {
    setError("");
    if (!active) {
      const ok = window.confirm(
        "Enter Admin Mode?\n\nYou will have elevated privileges. Use this only when you intend to manage venues, results, competitions, or other staff tools — not for normal browsing."
      );
      if (!ok) return;
    } else {
      const ok = window.confirm("Exit Admin Mode and return to your normal account view?");
      if (!ok) return;
    }

    startTransition(async () => {
      const result = await setAdminMode(!active);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={
          active
            ? "Exit Admin Mode — return to normal browsing"
            : "Admin Mode — elevated staff tools (venues, results, competitions)"
        }
        aria-label={active ? "Exit Admin Mode" : "Enter Admin Mode"}
        className={cn(
          "interactive-btn inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-xs font-extrabold disabled:opacity-50",
          active
            ? "btn-filled border-accent bg-accent text-white"
            : "border-accent/30 bg-white text-accent"
        )}
      >
        {active ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{active ? "Admin Mode on" : "Admin Mode"}</span>
      </button>
      {error && (
        <p className="absolute right-0 top-full z-50 mt-1 w-56 rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 shadow">
          {error}
        </p>
      )}
    </div>
  );
}
