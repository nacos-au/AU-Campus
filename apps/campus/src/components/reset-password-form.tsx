"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PasswordInput } from "@/components/password-input";
import { updatePassword, type ResetState } from "@/app/actions/auth";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    updatePassword,
    null
  );

  return (
    <>
      <form action={formAction} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            New password
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
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Confirm password
          </span>
          <PasswordInput
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            wrapperClassName="mt-1"
            className="w-full border border-rule bg-white px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
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
          {pending ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Link expired?{" "}
        <Link
          href="/forgot-password"
          className="font-semibold text-ink underline underline-offset-2"
        >
          Request a new one
        </Link>
      </p>
    </>
  );
}
