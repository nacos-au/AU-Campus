import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TalentSpotlight } from "@/lib/types";

const DISCIPLINE_LABELS: Record<string, string> = {
  design: "Design",
  development: "Development",
  writing: "Writing",
  debate: "Debate",
  other: "Other",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function TalentProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, bio")
    .eq("username", username)
    .maybeSingle<Pick<Profile, "id" | "display_name" | "username" | "bio">>();

  if (!profile) notFound();

  const { data: spotlight } = await supabase
    .from("talent_spotlights")
    .select("*")
    .eq("profile_id", profile.id)
    .eq("published", true)
    .maybeSingle<TalentSpotlight>();

  if (!spotlight) notFound();

  return (
    <div className="mx-auto max-w-3xl py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
        <Link href="/talent" className="hover:text-ink">
          Talent
        </Link>
      </p>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-accent">
        {DISCIPLINE_LABELS[spotlight.discipline] ?? spotlight.discipline}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold">{profile.display_name}</h1>
      <p className="mt-1 text-sm text-ink-soft">@{profile.username}</p>
      <p className="mt-6 font-serif text-2xl leading-snug">{spotlight.headline}</p>
      {spotlight.blurb && (
        <p className="mt-4 text-base leading-relaxed text-ink-soft">{spotlight.blurb}</p>
      )}
      {profile.bio && (
        <p className="mt-6 border-t border-rule pt-6 text-sm leading-relaxed">
          {profile.bio}
        </p>
      )}
      <p className="mt-8 text-sm">
        <Link href={`/author/${profile.username}`} className="font-semibold hover:text-accent">
          Published articles
        </Link>
      </p>
    </div>
  );
}
