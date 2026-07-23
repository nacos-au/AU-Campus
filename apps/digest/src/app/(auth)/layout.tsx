import Link from "next/link";
import { site } from "@/lib/site";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule py-5 text-center">
        <Link href="/" className="font-masthead text-4xl font-bold">
          {site.masthead}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        {children}
      </main>
    </div>
  );
}
