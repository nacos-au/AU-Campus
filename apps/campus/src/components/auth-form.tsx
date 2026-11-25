"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp, type AuthState } from "@/app/actions/auth";
import { PasswordInput } from "@/components/password-input";
import { DIGEST_URL, SCORE_URL } from "@/lib/urls";
import { USERNAME_HINT, USERNAME_MAX } from "@/lib/username";

function AuthBrandRow() {
  return (
    <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
      AU Campus · AU Digest · AU Score
    </p>
  );
}

/** Account creation on Campus — then pick Digest or Score on /welcome. */
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
        <AuthBrandRow />
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Use Campus sign-in for the Office, or open Digest / Score with the same email and
          password.
        </p>
        <Link
          href={`/signin${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 font-display text-sm font-bold text-white transition hover:bg-accent-hover"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (state && "pendingConfirm" in state && state.pendingConfirm) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <AuthBrandRow />
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          We created your account
          {state.email ? (
            <>
              {" "}
              for <span className="font-semibold text-ink">{state.email}</span>
            </>
          ) : null}
          . Confirm the message in your inbox, then sign in on Digest or Score with the same
          password.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href={`${SCORE_URL}/?auth=signin${state.email ? `&email=${encodeURIComponent(state.email)}` : ""}`}
            className="inline-flex justify-center border border-ink px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink hover:bg-ink hover:text-white"
          >
            AU Score
          </a>
          <a
            href={`${DIGEST_URL}/login${state.email ? `?email=${encodeURIComponent(state.email)}` : ""}`}
            className="inline-flex justify-center border border-ink px-5 py-3 text-xs font-bold uppercase tracking-wider text-ink hover:bg-ink hover:text-white"
          >
            AU Digest
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthBrandRow />
      <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        One AU Campus account for Digest, Score, and Campus — same email and password everywhere.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            First name
          </span>
          <input
            name="first_name"
            required
            autoComplete="given-name"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Last name
          </span>
          <input
            name="last_name"
            required
            autoComplete="family-name"
            className="mt-1 w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Username
          </span>
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft">
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
              className="w-full border border-rule bg-white py-3 pl-8 pr-4 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <span className="mt-1 block text-xs text-ink-soft">{USERNAME_HINT}</span>
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
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            wrapperClassName="mt-1"
            className="w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>

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
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-semibold text-ink underline underline-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
