import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/demo-mode";
import { getScoreDemoMode } from "@/lib/data/mode";
import type { ScoreFeedbackCategory } from "@/lib/types/database";

export interface ScoreFeedbackRow {
  id: string;
  page_path: string | null;
  match_id: string | null;
  category: ScoreFeedbackCategory;
  message: string;
  contact_email: string | null;
  user_agent: string | null;
  created_at: string;
}

const demoStore: ScoreFeedbackRow[] = [];

export async function createScoreFeedback(input: {
  page_path?: string | null;
  match_id?: string | null;
  category?: ScoreFeedbackCategory;
  message: string;
  contact_email?: string | null;
  user_agent?: string | null;
}): Promise<{ ok: true; id: string } | { error: string }> {
  const message = input.message.trim();
  if (message.length < 3 || message.length > 4000) {
    return { error: "Message must be 3–4000 characters" };
  }

  const category: ScoreFeedbackCategory =
    input.category === "idea" || input.category === "other" ? input.category : "bug";

  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    const row: ScoreFeedbackRow = {
      id: `fb-demo-${Date.now()}`,
      page_path: input.page_path ?? null,
      match_id: input.match_id ?? null,
      category,
      message,
      contact_email: input.contact_email?.trim() || null,
      user_agent: input.user_agent ?? null,
      created_at: new Date().toISOString(),
    };
    demoStore.unshift(row);
    return { ok: true, id: row.id };
  }

  const supabase = await createClient();
  const { data, error } = (await (supabase.from("score_feedback") as ReturnType<typeof supabase.from>)
    .insert({
      page_path: input.page_path ?? null,
      match_id: input.match_id ?? null,
      category,
      message,
      contact_email: input.contact_email?.trim() || null,
      user_agent: input.user_agent ?? null,
    } as Record<string, unknown>)
    .select("id")
    .single()) as { data: { id: string } | null; error: { message: string } | null };

  if (error) return { error: error.message };
  if (!data) return { error: "Could not save feedback" };
  return { ok: true, id: data.id };
}

export async function listScoreFeedback(limit = 100): Promise<ScoreFeedbackRow[]> {
  if (!hasSupabaseConfig() || (await getScoreDemoMode())) {
    return demoStore.slice(0, limit);
  }

  const supabase = await createClient();
  const { data } = (await supabase
    .from("score_feedback")
    .select("id, page_path, match_id, category, message, contact_email, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)) as { data: ScoreFeedbackRow[] | null };

  return data ?? [];
}
