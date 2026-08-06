"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";

/**
 * Header Sign in control + optional ?auth=signin|signup deep-link.
 */
export function AuthEntryButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const nextParam = searchParams.get("next") ?? "/";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (authParam === "signin" || authParam === "signup" || authParam === "1") {
      setMode(authParam === "signup" ? "signup" : "signin");
      setOpen(true);
    }
  }, [authParam]);

  function clearAuthQuery() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    // keep next only if still useful for other flows
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMode("signin");
          setOpen(true);
        }}
        className="interactive-btn rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold transition hover:bg-accent hover:text-white sm:px-5 sm:text-sm"
      >
        Sign in
      </button>
      <AuthModal
        open={open}
        initialMode={mode}
        next={nextParam.startsWith("/") ? nextParam : "/"}
        onClose={() => {
          setOpen(false);
          if (authParam) clearAuthQuery();
        }}
      />
    </>
  );
}

/** Used by voting / gated actions — opens the same branded auth modal. */
export function useAuthModal() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openAuth: () => setOpen(true),
    closeAuth: () => setOpen(false),
    AuthModalSlot: (
      <AuthModal open={open} onClose={() => setOpen(false)} initialMode="signin" />
    ),
  };
}
