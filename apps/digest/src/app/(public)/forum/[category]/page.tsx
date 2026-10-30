import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadForumAccess } from "@/lib/forum-access";
import type { ForumCategory, ForumThread } from "@/lib/types";
import { ForumGate } from "../ForumGate";
import { NewThreadForm } from "../ForumControls";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const access = await loadForumAccess();
  if (!access.allowed) return <ForumGate signedIn={access.signedIn} />;

  const { category: slug } = await params;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("forum_categories")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<ForumCategory>();
  if (!category) notFound();

  const { data } = await supabase
    .from("forum_threads")
    .select("*, profiles(display_name, username)")
    .eq("category_id", category.id)
    .eq("status", "visible")
    .order("updated_at", { ascending: false });
  const threads = (data ?? []) as unknown as ForumThread[];

  return (
    <div className="py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <Link href="/forum" className="hover:text-ink">
          Forum
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold">{category.name}</h1>
      {category.description && (
        <p className="mt-2 text-sm text-ink-soft">{category.description}</p>
      )}

      {threads.length === 0 ? (
        <p className="py-10 text-sm text-ink-soft">No threads yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule">
          {threads.map((thread) => (
            <li key={thread.id} className="py-4">
              <Link href={`/forum/t/${thread.id}`} className="font-serif text-xl font-bold hover:text-accent">
                {thread.title}
              </Link>
              <p className="mt-1 text-xs text-ink-soft">
                {thread.profiles?.display_name ?? "Member"} · {thread.reply_count} replies ·{" "}
                {thread.score} points
              </p>
            </li>
          ))}
        </ul>
      )}

      {!access.demo && (
        <NewThreadForm categoryId={category.id} canStart={access.canStartThread} />
      )}
    </div>
  );
}
