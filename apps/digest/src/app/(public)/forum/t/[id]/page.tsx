import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadForumAccess } from "@/lib/forum-access";
import type { ForumPost, ForumThread } from "@/lib/types";
import { ForumGate } from "../../ForumGate";
import { ReplyForm, VoteReport } from "../../ForumControls";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await loadForumAccess();
  if (!access.allowed) return <ForumGate signedIn={access.signedIn} />;

  const { id } = await params;
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("forum_threads")
    .select("*, profiles(display_name, username), forum_categories(slug, name)")
    .eq("id", id)
    .eq("status", "visible")
    .maybeSingle<ForumThread>();
  if (!thread) notFound();

  const { data: postsData } = await supabase
    .from("forum_posts")
    .select("*, profiles(display_name, username)")
    .eq("thread_id", thread.id)
    .eq("status", "visible")
    .order("created_at", { ascending: true });
  const posts = (postsData ?? []) as unknown as ForumPost[];

  const category = thread.forum_categories;

  return (
    <div className="mx-auto max-w-3xl py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <Link href="/forum" className="hover:text-ink">
          Forum
        </Link>
        {category && (
          <>
            {" / "}
            <Link href={`/forum/${category.slug}`} className="hover:text-ink">
              {category.name}
            </Link>
          </>
        )}
      </p>
      <h1 className="mt-3 font-serif text-4xl font-bold">{thread.title}</h1>
      <p className="mt-2 text-xs text-ink-soft">
        {thread.profiles?.username ? (
          <Link href={`/author/${thread.profiles.username}`} className="font-semibold text-ink hover:text-accent">
            {thread.profiles.display_name}
          </Link>
        ) : (
          thread.profiles?.display_name
        )}
      </p>
      <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed">{thread.body}</p>
      {!access.demo && (
        <VoteReport targetType="thread" targetId={thread.id} score={thread.score} />
      )}

      <section className="mt-10 border-t-2 border-ink pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">Replies</h2>
        {posts.length === 0 ? (
          <p className="py-6 text-sm text-ink-soft">No replies yet.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {posts.map((post) => (
              <li key={post.id} className="py-5">
                <p className="text-xs text-ink-soft">
                  {post.profiles?.username ? (
                    <Link
                      href={`/author/${post.profiles.username}`}
                      className="font-semibold text-ink hover:text-accent"
                    >
                      {post.profiles.display_name}
                    </Link>
                  ) : (
                    post.profiles?.display_name
                  )}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
                {!access.demo && (
                  <VoteReport targetType="post" targetId={post.id} score={post.score} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!access.demo && <ReplyForm threadId={thread.id} />}
    </div>
  );
}
