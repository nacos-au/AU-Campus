"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Ghost,
  Vote,
  X,
} from "lucide-react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { USERNAME_HINT, USERNAME_MAX } from "@/lib/username";
import { cn } from "@/lib/utils/cn";

const CLOSE_MS = 280;
const LOGO_SRC = "/AU Logo.webp";

type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  next?: string;
};

const FEATURES = [
  {
    icon: Activity,
    title: "Live match centre",
    body: "Scores, events, and updates as they happen on campus.",
  },
  {
    icon: BarChart3,
    title: "Tables & standings",
    body: "League tables, form, and competition context in one place.",
  },
  {
    icon: Vote,
    title: "Fan voting",
    body: "Call the result — back your side before kick-off.",
  },
  {
    icon: Ghost,
    title: "Phantom insights",
    body: "Smart session tools for keepers and match-day crews.",
  },
] as const;

/**
 * Centered PL-inspired auth modal — dark AU maroon shell, split form + features.
 * Email/password only (no social providers).
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

  const fieldClass =
    "mt-1.5 w-full rounded-lg border border-white/35 bg-transparent px-3.5 py-3 text-sm text-white placeholder:text-white/40 focus:border-white focus:outline-none";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
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
            "linear-gradient(135deg, rgba(26,5,8,0.88) 0%, rgba(61,15,24,0.82) 50%, rgba(0,31,16,0.75) 100%)",
          backdropFilter: "blur(3px)",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 grid w-full max-w-[920px] overflow-hidden rounded-3xl shadow-2xl transition-all duration-300 ease-out lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]",
          entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        )}
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(122,31,43,0.55), transparent 55%), #1a0508",
        }}
      >
        {/* Left — auth form */}
        <div className="relative flex flex-col px-5 py-5 text-white sm:px-8 sm:py-7">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Image
                src={LOGO_SRC}
                alt="AU Score"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="font-display text-lg font-extrabold tracking-tight">
                AU Score
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className="inline-flex w-fit rounded-full border border-white/25 p-1"
            role="tablist"
            aria-label="Account mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              onClick={() => setMode("signin")}
              className={cn(
                "rounded-full px-4 py-1.5 font-display text-sm font-bold transition",
                mode === "signin"
                  ? "bg-white text-[#1a0508]"
                  : "text-white/80 hover:text-white"
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => setMode("signup")}
              className={cn(
                "rounded-full px-4 py-1.5 font-display text-sm font-bold transition",
                mode === "signup"
                  ? "bg-white text-[#1a0508]"
                  : "text-white/80 hover:text-white"
              )}
            >
              Join AU Score
            </button>
          </div>

          <h2
            id={titleId}
            className="mt-7 font-display text-3xl font-extrabold tracking-tight sm:text-[2.15rem]"
          >
            {mode === "signup" ? "Join AU Score" : "Sign in"}
          </h2>

          <form action={formAction} className="mt-6 flex flex-1 flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            {mode === "signup" && (
              <>
                <label className="block">
                  <span className="text-sm font-medium text-white/90">Full name</span>
                  <input
                    name="display_name"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    className={fieldClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-white/90">Username</span>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-white/45">
                      @
                    </span>
                    <input
                      name="username"
                      required
                      autoComplete="username"
                      spellCheck={false}
                      minLength={3}
                      maxLength={USERNAME_MAX}
                      placeholder="your.handle"
                      title={USERNAME_HINT}
                      className={cn(fieldClass, "mt-0 pl-8")}
                    />
                  </div>
                  <span className="mt-1.5 block text-xs text-white/45">{USERNAME_HINT}</span>
                </label>
              </>
            )}

            <label className="block">
              <span className="text-sm font-medium text-white/90">Email Address</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter email address"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white/90">
                {mode === "signup" ? "Password" : "Account password"}
              </span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="Enter password"
                tone="dark"
                className={fieldClass}
              />
            </label>

            {state?.error && (
              <p className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-full bg-white py-3.5 font-display text-sm font-extrabold text-[#1a0508] transition hover:bg-white/90 disabled:opacity-50"
            >
              {pending
                ? mode === "signup"
                  ? "Creating…"
                  : "Signing in…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign In"}
            </button>
          </form>
        </div>

        {/* Right — feature panel */}
        <div className="relative hidden flex-col border-t border-white/10 p-5 sm:p-7 lg:flex lg:border-l lg:border-t-0">
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="flex h-full flex-col rounded-2xl px-5 py-7"
            style={{
              background:
                "linear-gradient(165deg, rgba(0,0,0,0.35) 0%, rgba(61,15,24,0.55) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-center font-display text-2xl font-extrabold leading-snug tracking-tight text-white">
              Shape campus sport around you
            </h3>

            <ul className="mt-8 flex flex-1 flex-col justify-center gap-5">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/60">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-center text-xs text-white/45">
              One campus account — live scores, tables, and more.
            </p>
          </div>
        </div>

        {/* Mobile feature strip */}
        <div className="border-t border-white/10 px-5 py-5 lg:hidden">
          <p className="font-display text-sm font-bold text-white">
            Live scores · tables · voting · Phantom
          </p>
          <p className="mt-1 text-xs text-white/50">
            One campus account for AU Score and AU Digest.
          </p>
        </div>
      </div>
    </div>
  );
}
