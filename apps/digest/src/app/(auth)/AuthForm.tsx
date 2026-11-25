"use client";

import { useActionState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/PasswordInput";
import { signIn, type AuthState } from "./actions";

const CAMPUS_URL =
  process.env.NEXT_PUBLIC_CAMPUS_URL ?? "http://localhost:3000";
const DIGEST_URL =
  process.env.NEXT_PUBLIC_DIGEST_URL ?? "http://localhost:3001";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const emailPrefill = searchParams.get("email") ?? "";
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signIn,
    null
  );

  const campusSignupHref = useMemo(() => {
    const url = new URL("/signup", CAMPUS_URL);
    const returnTo = next.startsWith("http")
      ? next
      : `${DIGEST_URL.replace(/\/$/, "")}${next.startsWith("/") ? next : `/${next}`}`;
    url.searchParams.set("next", returnTo);
    return url.toString();
  }, [next]);

  // Signup is Campus-only; this form is sign-in only.
  if (mode === "signup") {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
        AU Campus · AU Digest · AU Score
      </p>
      <h1 className="mt-4 text-center font-serif text-3xl font-bold">
        {t("signIn")}
      </h1>
      <p className="mt-2 text-center text-sm text-ink-soft">
        Same email and password across AU apps.
      </p>
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
            defaultValue={emailPrefill}
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

        <p className="text-right text-sm">
          <a
            href={`${CAMPUS_URL.replace(/\/$/, "")}/forgot-password`}
            className="font-semibold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Forgot password?
          </a>
        </p>

        {state?.error && (
          <p className="border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-ink py-2.5 text-sm font-semibold tracking-wide text-paper transition-colors hover:bg-accent disabled:opacity-50"
        >
          {t("signInCta")}
        </button>
      </form>

      <div className="mt-8 border-t border-rule pt-5 text-center">
        <p className="text-xs text-ink-soft">{t("noAccount")}</p>
        <a
          href={campusSignupHref}
          className="mt-2 inline-block border border-ink px-5 py-2 text-xs font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-ink hover:text-paper"
        >
          {t("signUpCampus")}
        </a>
      </div>
    </div>
  );
}
