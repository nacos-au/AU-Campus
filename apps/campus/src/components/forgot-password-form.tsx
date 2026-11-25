"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestPasswordReset,
  type ResetState,
} from "@/app/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    null
  );

  if (state?.ok) {
    return (
      <div className="mt-8 border border-rule bg-white px-4 py-3 text-sm text-ink">
        If an account exists for that email, a reset link is on the way. Check your
        inbox (and spam). The link expires after a short time.
        <p className="mt-3">
          <Link
            href="/signin"
            className="font-semibold text-ink underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
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
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
