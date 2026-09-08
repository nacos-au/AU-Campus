"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "@/components/auth/auth-modal";

const CAMPUS =
  process.env.NEXT_PUBLIC_CAMPUS_URL?.replace(/\/$/, "") || "http://localhost:3000";

/**
 * Header Sign in control + ?auth=signin deep-link.
 * ?auth=signup redirects to AU Campus (accounts are created there).
 */
export function AuthEntryButton() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const reasonParam = searchParams.get("reason");
  const nextParam = searchParams.get("next") ?? "/";

  const [open, setOpen] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);

  useEffect(() => {
    if (authParam === "signup") {
      window.location.href = `${CAMPUS}/signup`;
      return;
    }
    if (authParam === "signin" || authParam === "1") {
      setOpen(true);
      if (reasonParam === "session_expired") setExpiredNotice(true);
    }
  }, [authParam, reasonParam]);

  function clearAuthQuery() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("reason");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    setExpiredNotice(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="interactive-btn rounded-full border-2 border-accent px-3 py-1.5 font-display text-xs font-bold transition hover:bg-accent hover:text-white sm:px-5 sm:text-sm"
      >
        Sign in
      </button>
      {expiredNotice && open && (
        <p className="sr-only">Your session expired after 2 hours. Sign in again.</p>
      )}
      <AuthModal
        open={open}
        next={nextParam.startsWith("/") ? nextParam : "/"}
        sessionExpired={expiredNotice}
        onClose={() => {
          setOpen(false);
          if (authParam) clearAuthQuery();
        }}
      />
    </>
  );
}

export function useAuthModal() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openAuth: () => setOpen(true),
    closeAuth: () => setOpen(false),
    AuthModalSlot: <AuthModal open={open} onClose={() => setOpen(false)} />,
  };
}
