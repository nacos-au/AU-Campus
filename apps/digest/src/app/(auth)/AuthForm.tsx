"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/PasswordInput";
import { signIn, type AuthState } from "./actions";

const CAMPUS_URL =
  process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  // Signup is Campus-only; this form is sign-in only.
  if (mode === "signup") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-serif text-3xl font-bold text-center">
        {t("signIn")}
      </h1>
      <div className="mx-auto my-5 h-px w-16 bg-ink" />

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("email")}
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("password")}
          </span>
          <PasswordInput
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="mt-1 w-full border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none"
          />
        </label>

        {state?.error && (
          <p className="text-sm text-accent border border-accent/30 bg-accent-soft px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-ink text-paper py-2.5 text-sm font-semibold tracking-wide hover:bg-accent transition-colors disabled:opacity-50"
        >
          {t("signInCta")}
        </button>
      </form>

      <div className="mt-8 border-t border-rule pt-5 text-center">
        <p className="text-xs text-ink-soft">{t("noAccount")}</p>
        <a
          href={`${CAMPUS_URL}/signup`}
          className="mt-2 inline-block border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {t("signUpCampus")}
        </a>
      </div>
    </div>
  );
}
