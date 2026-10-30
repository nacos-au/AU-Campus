import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { loadForumAccess } from "@/lib/forum-access";
import type { ForumCategory } from "@/lib/types";
import { ForumGate } from "./ForumGate";

export const metadata: Metadata = { title: "Forum" };

export default async function ForumPage() {
  const access = await loadForumAccess();
  if (!access.allowed) return <ForumGate signedIn={access.signedIn} />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("forum_categories")
    .select("*")
    .order("position");
  const categories = (data ?? []) as ForumCategory[];

  return (
    <div className="py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">Forum</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Verified members can reply. Starting a thread takes a reputation of 10,
          earned from votes on what you write. Editors can start a thread immediately.
        </p>
        {access.profile && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Your reputation: {access.profile.forum_karma ?? 0}
          </p>
        )}
      </header>
      <ul className="mt-6 divide-y divide-rule">
        {categories.map((category) => (
          <li key={category.id} className="py-5">
            <Link href={`/forum/${category.slug}`} className="font-serif text-2xl font-bold hover:text-accent">
              {category.name}
            </Link>
            {category.description && (
              <p className="mt-1 text-sm text-ink-soft">{category.description}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
