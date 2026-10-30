"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { setAdminMode } from "@/app/actions/admin-mode";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  const { confirm } = useConfirm();

  if (!canUse) return null;

  async function toggle() {
    setError("");
    const ok = await confirm(
      active
        ? {
            eyebrow: "Admin Mode",
            title: "Exit Admin Mode?",
            body: "You’ll return to the normal fan view. You can come back any time.",
            confirmLabel: "Exit",
          }
        : {
            eyebrow: "Admin Mode",
            title: "Enter Admin Mode?",
            body: "Elevated staff tools for venues, results, competitions and keeper assignments. Use it only when you intend to manage — not for normal browsing.",
            confirmLabel: "Enter",
          }
    );
    if (!ok) return;

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
        <p className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold text-red-600 shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}
