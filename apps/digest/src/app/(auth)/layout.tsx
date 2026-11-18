import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule py-5 text-center">
        <Link href="/" className="inline-flex items-center justify-center gap-3">
          <Image
            src="/AUSA.png"
            alt={site.university}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          <span className="font-masthead text-4xl font-bold leading-none">
            {site.masthead}
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        {children}
      </main>
    </div>
  );
}
