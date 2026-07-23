import Image from "next/image";
import Link from "next/link";
import { digestAuthUrl } from "@/lib/urls";

export function SiteHeader() {
  return (
    <header className="mb-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
      <Link href="/" className="flex flex-col items-center sm:items-start">
        <Image
          src="/au-logo.webp"
          alt="Achievers University"
          width={140}
          height={48}
          style={{ width: "auto", height: "3rem" }}
          priority
        />
        <span className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">AU Campus</span>
      </Link>

      <nav className="flex items-center gap-3 text-sm font-semibold">
        <Link
          href={digestAuthUrl("login")}
          className="rounded-full border-2 border-[var(--accent)] px-4 py-2 transition hover:bg-white"
        >
          Sign in
        </Link>
        <Link
          href={digestAuthUrl("signup")}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-white transition hover:opacity-90"
        >
          Sign up
        </Link>
      </nav>
    </header>
  );
}
