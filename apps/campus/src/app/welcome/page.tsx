import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { WelcomeChooser } from "@/components/welcome-chooser";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/urls";

export const metadata: Metadata = { title: "You’re in" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!hasSupabaseConfig()) redirect("/signup");

  const { next: nextRaw } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/signin", "http://local.invalid");
    login.searchParams.set("next", "/welcome");
    redirect(`${login.pathname}${login.search}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-16 sm:px-6">
        <WelcomeChooser email={user.email ?? ""} next={nextRaw ?? null} />
      </main>
    </div>
  );
}
