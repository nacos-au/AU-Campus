"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig, CAMPUS_URL, DIGEST_URL, SCORE_URL } from "@/lib/urls";

export type AuthState = { error: string } | null;

function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;

  const allowed = [CAMPUS_URL, DIGEST_URL, SCORE_URL].filter(Boolean);
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

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Campus is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY, then restart the server.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!email || !password) return { error: "Email and password are required." };
  if (!displayName) return { error: "Full name is required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      return {
        error:
          "Account created, but email confirmation is still on in Supabase. Turn off “Confirm email” under Authentication → Providers → Email, or confirm your inbox.",
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-up failed." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Campus is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY, then restart the server.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        error:
          error.message === "Invalid login credentials"
            ? "Invalid email or password."
            : error.message,
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-in failed." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
  revalidatePath("/", "layout");
  redirect("/");
}
