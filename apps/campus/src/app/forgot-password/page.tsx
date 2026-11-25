import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          AU Campus · AU Digest · AU Score
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
          Reset password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Enter the email you used to sign up. We&apos;ll send a link to choose a
          new password. Same account works across all AU apps.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-ink-soft">
          Remembered it?{" "}
          <Link
            href="/signin"
            className="font-semibold text-ink underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
