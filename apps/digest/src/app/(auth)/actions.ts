"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;

  const allowed = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_CAMPUS_URL,
    process.env.NEXT_PUBLIC_SCORE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ].filter(Boolean) as string[];

  try {
    const target = new URL(next);
    if (allowed.some((origin) => target.origin === new URL(origin).origin)) {
      return next;
    }
  } catch {
    // fall through
  }

  return "/";
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      data: { display_name: String(formData.get("display_name") ?? "") },
    },
  });
  if (error) return { error: error.message };

  if (!data.session) {
    return {
      error:
        "Account created, but email confirmation is still on in Supabase. Turn off “Confirm email” under Authentication → Providers → Email, or confirm your inbox.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
