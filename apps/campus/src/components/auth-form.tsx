"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthState } from "@/app/actions/auth";
import { SCORE_URL } from "@/lib/urls";

/** Campus is signup-only — sign in happens on AU Score. */
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signUp,
    null
  );

  if (mode === "signin") {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Sign in on AU Score
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          AU Campus is for creating accounts. Sign in from AU Score with the same credentials.
        </p>
        <a
          href={`${SCORE_URL}/?auth=signin`}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-display text-sm font-bold text-white transition hover:bg-accent-hover"
        >
          Open AU Score
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        One AU Campus account unlocks AU Digest, AU Score, and future student apps.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Full name
          </span>
          <input
            name="display_name"
            required
            autoComplete="name"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        {state?.error && (
          <p className="border border-accent/30 bg-white px-3 py-2 text-sm text-accent">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-accent py-3 font-display text-sm font-bold text-white transition hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <a
          href={`${SCORE_URL}/?auth=signin`}
          className="font-semibold text-ink underline underline-offset-2"
        >
          Sign in on AU Score
        </a>
      </p>
    </div>
  );
}
