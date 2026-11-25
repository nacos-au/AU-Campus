"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/password-input";

export function SignInForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const emailPrefill = searchParams.get("email") ?? "";
  const reason = searchParams.get("reason");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null);

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        AU Campus · AU Digest · AU Score
      </p>
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Same email and password across AU apps. Super admins can open the Office after signing
        in.
      </p>
      {reason === "session_expired" && (
        <p className="mt-4 border border-rule bg-white px-3 py-2 text-sm text-ink-soft">
          Your session ended. Sign in again to continue.
        </p>
      )}

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={emailPrefill}
            autoComplete="email"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">Password</span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            wrapperClassName="mt-1"
            className="w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <p className="text-right text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Forgot password?
          </Link>
        </p>

        {state && "error" in state && state.error && (
          <p className="border border-accent/30 bg-white px-3 py-2 text-sm text-accent">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent py-3 font-display text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link
          href={`/signup${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-ink underline underline-offset-2"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
