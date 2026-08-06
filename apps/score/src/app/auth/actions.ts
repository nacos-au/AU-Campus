"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { validateUsername } from "@/lib/username";
import type { Database } from "@/lib/types/supabase";

export type AuthState = { error: string } | null;

function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "/";
  if (next.startsWith("/") && !next.startsWith("//")) return next;

  const allowed = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_CAMPUS_URL,
    process.env.NEXT_PUBLIC_DIGEST_URL,
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

async function assertUsernameAvailable(
  supabase: Awaited<ReturnType<typeof createAuthClient>>,
  username: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) return error.message;
  if (data) return "That username is already taken.";
  return null;
}

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Score is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to apps/score/.env.local, then restart the Score dev server.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const supabase = await createAuthClient();
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

export async function signUp(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Score is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to apps/score/.env.local, then restart the Score dev server.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const parsed = validateUsername(String(formData.get("username") ?? ""));

  if (!email || !password) return { error: "Email and password are required." };
  if (!displayName) return { error: "Full name is required." };
  if (!parsed.ok) return { error: parsed.error };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const supabase = await createAuthClient();
    const taken = await assertUsernameAvailable(supabase, parsed.username);
    if (taken) return { error: taken };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username: parsed.username },
      },
    });
    if (error) {
      if (/duplicate|unique|username/i.test(error.message)) {
        return { error: "That username is already taken." };
      }
      return { error: error.message };
    }
    if (!data.session) {
      return {
        error:
          "Account created, but email confirmation is still on in Supabase. Turn off “Confirm email” under Authentication → Providers → Email, or confirm your inbox.",
      };
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: parsed.username,
          display_name: displayName,
        } satisfies Database["public"]["Tables"]["profiles"]["Update"])
        .eq("id", data.user.id);
      if (profileError && /unique|duplicate/i.test(profileError.message)) {
        return { error: "That username is already taken." };
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-up failed." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      const supabase = await createAuthClient();
      await supabase.auth.signOut();
    } catch {
      // still clear the local session UX
    }
  }
  try {
    const { cookies } = await import("next/headers");
    const { ADMIN_MODE_COOKIE, adminModeCookieOptions } = await import("@/lib/admin-mode");
    const store = await cookies();
    const opts = adminModeCookieOptions(false);
    store.set(ADMIN_MODE_COOKIE, opts.value, {
      path: opts.path,
      maxAge: 0,
      sameSite: opts.sameSite,
    });
  } catch {
    // ignore
  }
  revalidatePath("/", "layout");
  redirect("/");
}
