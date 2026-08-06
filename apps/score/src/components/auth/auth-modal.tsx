"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils/cn";

const CLOSE_MS = 280;

type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  next?: string;
};

/**
 * Centered Score auth modal — green wash + dark header, same family as the account drawer.
 */
export function AuthModal({
  open,
  onClose,
  initialMode = "signin",
  next = "/",
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);

  const action = mode === "signup" ? signUp : signIn;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setMounted(true);
    } else if (mounted) {
      setEntered(false);
      const t = window.setTimeout(() => setMounted(false), CLOSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, initialMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClose() {
    setEntered(false);
    window.setTimeout(() => {
      setMounted(false);
      onClose();
      router.refresh();
    }, CLOSE_MS);
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close"
        onClick={handleClose}
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

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 w-full max-w-[420px] overflow-hidden rounded-3xl bg-[#f4f4f4] shadow-2xl transition-all duration-300 ease-out",
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        )}
      >
        <div className="relative isolate overflow-hidden bg-[#00150c] px-5 pb-7 pt-4 text-white">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse 90% 80% at 85% -10%, rgba(0,200,83,0.55), transparent 70%), radial-gradient(ellipse 60% 50% at 20% 0%, rgba(0,78,40,0.45), transparent 65%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,78,40,0.35) 35%, rgba(0,200,83,0.85) 100%)",
              filter: "blur(12px)",
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

          <div className="relative z-10 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative z-10 text-center">
            <h2 id={titleId} className="font-display text-2xl font-extrabold tracking-tight">
              {mode === "signup" ? "Create account" : "Sign in"}
            </h2>
            <p className="mt-1.5 text-sm text-white/70">
              {mode === "signup"
                ? "Join AU Score with your campus account"
                : "Welcome back to AU Score"}
            </p>
          </div>
        </div>

        <div className="px-5 py-6">
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />

            {mode === "signup" && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-accent/60">
                  Full name
                </span>
                <input
                  name="display_name"
                  required
                  autoComplete="name"
                  className="mt-1 w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm text-accent focus:border-accent focus:outline-none"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-accent/60">
                Email
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm text-accent focus:border-accent focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-accent/60">
                Password
              </span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="mt-1 w-full rounded-xl border border-rule bg-white px-4 py-3 text-sm text-accent focus:border-accent focus:outline-none"
              />
            </label>

            {state?.error && (
              <p className="rounded-xl border border-accent/30 bg-white px-3 py-2 text-sm font-semibold text-accent">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-accent py-3 font-display text-sm font-bold text-white transition hover:bg-[#5e1721] disabled:opacity-50"
            >
              {pending
                ? mode === "signup"
                  ? "Creating…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-accent/70">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-display font-bold text-accent underline underline-offset-2 transition hover:text-[#5e1721]"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
