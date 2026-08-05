"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, type AuthState } from "@/app/auth/actions";
import { PasswordInput } from "@/components/ui/password-input";

const DIGEST_URL =
  process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="mb-6 text-center text-sm opacity-70">
        Same campus account as AU Digest. Sign up on Digest if you do not have an account yet.
        After signing in here you should see <span className="font-semibold">Sign out</span> in the header.
      </p>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide opacity-60">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border border-rule px-4 py-3 focus:border-accent focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide opacity-60">
            Password
          </span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="mt-1 w-full border border-rule px-4 py-3 focus:border-accent focus:outline-none"
          />
        </label>

        {state?.error && (
          <p className="border border-accent/30 bg-[#faf9fa] px-3 py-2 text-sm text-accent">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full py-3 font-display text-sm font-bold disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm opacity-60">
        New here?{" "}
        <a
          href={`${DIGEST_URL}/signup`}
          className="font-semibold text-accent underline underline-offset-2"
        >
          Create an account
        </a>
      </p>
    </div>
  );
}
