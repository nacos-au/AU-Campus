import { SiteHeader } from "@/components/site-header";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
          AU Campus · AU Digest · AU Score
        </p>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Use at least 8 characters. This updates your password for Digest, Score,
          and Campus.
        </p>

        <ResetPasswordForm />
      </main>
    </div>
  );
}
