"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { welcomeUrl } from "@/lib/auth-destinations";
import { hasSupabaseConfig, CAMPUS_URL, DIGEST_URL, SCORE_URL } from "@/lib/urls";
import { validateUsername } from "@/lib/username";

export type AuthState =
  | { error: string }
  | { pendingConfirm: true; email: string }
  | null;

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
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const displayName = `${firstName} ${lastName}`.trim();
  const parsed = validateUsername(String(formData.get("username") ?? ""));

  if (!email || !password) return { error: "Email and password are required." };
  if (!firstName) return { error: "First name is required." };
  if (!lastName) return { error: "Last name is required." };
  if (!parsed.ok) return { error: parsed.error };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const supabase = await createClient();
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", parsed.username)
      .maybeSingle();
    if (lookupError) return { error: lookupError.message };
    if (existing) return { error: "That username is already taken." };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          username: parsed.username,
        },
      },
    });
    if (error) {
      if (/duplicate|unique|username/i.test(error.message)) {
        return { error: "That username is already taken." };
      }
      return { error: error.message };
    }
    if (!data.session) {
      return { pendingConfirm: true, email };
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          username: parsed.username,
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
        })
        .eq("id", data.user.id);
    }

    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set("au_auth_session_started", String(Date.now()), {
      path: "/",
      maxAge: 60 * 60 * 2,
      sameSite: "lax",
      httpOnly: true,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-up failed." };
  }

  revalidatePath("/", "layout");
  const next = safeNext(formData.get("next"));
  redirect(welcomeUrl(next === "/" ? null : next));
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
    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set("au_auth_session_started", String(Date.now()), {
      path: "/",
      maxAge: 60 * 60 * 2,
      sameSite: "lax",
      httpOnly: true,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sign-in failed." };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export type ResetState = { error?: string; ok?: boolean } | null;

/** Send a password-reset email (free Supabase Auth). */
export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  if (!hasSupabaseConfig()) {
    return {
      error:
        "Campus is missing Supabase keys. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY, then restart the server.",
    };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email for your AU account." };

  try {
    const supabase = await createClient();
    const redirectTo = `${CAMPUS_URL.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(
      "/reset-password"
    )}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) return { error: error.message };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not send reset email.",
    };
  }

  return { ok: true };
}

export async function updatePassword(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  if (!hasSupabaseConfig()) {
    return { error: "Campus is missing Supabase keys." };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not update password.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/welcome");
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
  try {
    const { cookies } = await import("next/headers");
    const { OFFICE_MODE_COOKIE, officeModeCookieOptions } = await import("@/lib/admin-mode");
    const store = await cookies();
    const opts = officeModeCookieOptions(false);
    store.set(OFFICE_MODE_COOKIE, opts.value, {
      path: opts.path,
      maxAge: 0,
      sameSite: opts.sameSite,
    });
    store.set("au_auth_session_started", "", { path: "/", maxAge: 0 });
  } catch {
    // ignore
  }
  revalidatePath("/", "layout");
  redirect("/");
}
