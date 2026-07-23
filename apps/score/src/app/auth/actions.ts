"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function signIn(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return { error: "Sign-in is not configured yet. Add Supabase keys to this app." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}
