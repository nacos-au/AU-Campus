import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/urls";
import { signOut } from "@/app/actions/auth";

export async function SiteHeader() {
  let email: string | null = null;
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email ?? null;
    } catch {
      email = null;
    }
  }

  return (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/au-logo.webp"
          alt="Achievers University"
          width={40}
          height={40}
          className="h-9 w-9 object-contain sm:h-10 sm:w-10"
          priority
        />
        <span className="font-display text-lg font-extrabold tracking-tight text-ink sm:text-xl">
          AU Campus
        </span>
      </Link>

      <nav className="flex items-center gap-2 sm:gap-3">
        {email ? (
          <>
            <span className="hidden max-w-[12rem] truncate text-xs text-ink-soft sm:inline" title={email}>
              {email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full border border-rule px-3 py-1.5 text-xs font-bold text-ink transition hover:border-ink sm:px-4 sm:text-sm"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/signup"
            className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white transition hover:bg-accent-hover sm:px-4 sm:text-sm"
          >
            Sign up
          </Link>
        )}
      </nav>
    </header>
  );
}
