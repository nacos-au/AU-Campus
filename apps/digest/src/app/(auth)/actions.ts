"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { hasSupabaseConfig } from "@/lib/demo-mode";

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
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Digest is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to apps/digest/.env.local, then restart the dev server.",
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
        "Digest is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to apps/digest/.env.local, then restart the dev server.",
    };
  }

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email: String(formData.get("email") ?? "").trim(),
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-up failed." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
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
