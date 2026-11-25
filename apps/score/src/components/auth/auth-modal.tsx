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
import { signIn, type AuthState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils/cn";

const CLOSE_MS = 280;
const LOGO_SRC = "/AU Logo.webp";
const CAMPUS_URL =
  process.env.NEXT_PUBLIC_CAMPUS_URL?.replace(/\/$/, "") || "http://localhost:3000";
const SCORE_URL =
  process.env.NEXT_PUBLIC_SCORE_URL?.replace(/\/$/, "") || "http://localhost:3002";

type Props = {
  open: boolean;
  onClose: () => void;
  /** @deprecated Signup is Campus-only — ignored */
  initialMode?: "signin" | "signup";
  next?: string;
  email?: string;
  sessionExpired?: boolean;
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

/** Centered auth modal — Sign in only. Create accounts on AU Campus. */
export function AuthModal({
  open,
  onClose,
  next = "/",
  email = "",
  sessionExpired = false,
}: Props) {
  const campusSignupHref = (() => {
    const url = new URL("/signup", CAMPUS_URL);
    const returnTo = next.startsWith("http")
      ? next
      : `${SCORE_URL}${next.startsWith("/") ? next : `/${next}`}`;
    url.searchParams.set("next", returnTo);
    return url.toString();
  })();
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);

  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      setEntered(false);
      const t = window.setTimeout(() => setMounted(false), CLOSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
              <span className="font-display text-lg font-extrabold tracking-tight">AU Score</span>
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

          <h2
            id={titleId}
            className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-[2.15rem]"
          >
            Sign in
          </h2>
          <p className="mt-2 text-sm text-white/65">
            Same email and password across AU apps.
          </p>

          <form action={formAction} className="mt-6 flex flex-1 flex-col gap-4">
            <input type="hidden" name="next" value={next} />

            <label className="block">
              <span className="text-sm font-medium text-white/90">Email Address</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter email address"
                defaultValue={email}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-white/90">Account password</span>
              <PasswordInput
                name="password"
                required
                minLength={8}
                autoComplete="current-password"
                placeholder="Enter password"
                tone="dark"
                className={fieldClass}
              />
            </label>

            <p className="text-right text-sm">
              <a
                href={`${process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000"}/forgot-password`}
                className="font-semibold text-white/70 underline underline-offset-2 hover:text-white"
              >
                Forgot password?
              </a>
            </p>

            {sessionExpired && !state?.error && (
              <p className="rounded-lg border border-amber-200/40 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-white">
                Your session expired after 2 hours. Sign in again to continue.
              </p>
            )}

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
              {pending ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/60">
            New here?{" "}
            <a
              href={campusSignupHref}
              className="font-display font-bold text-white underline underline-offset-2"
            >
              Create an account on AU Campus
            </a>
          </p>
          <p className="mt-2 text-center text-[11px] uppercase tracking-[0.12em] text-white/40">
            AU Campus · AU Digest · AU Score
          </p>
        </div>

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

        <div className="border-t border-white/10 px-5 py-5 lg:hidden">
          <p className="font-display text-sm font-bold text-white">
            Live scores · tables · voting · Phantom
          </p>
        </div>
      </div>
    </div>
  );
}
