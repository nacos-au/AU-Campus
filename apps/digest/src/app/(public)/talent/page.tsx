import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { TalentSpotlight } from "@/lib/types";

export const metadata: Metadata = { title: "Talent" };

const DISCIPLINE_LABELS: Record<string, string> = {
  design: "Design",
  development: "Development",
  writing: "Writing",
  debate: "Debate",
  other: "Other",
};

export default async function TalentPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("talent_spotlights")
    .select("*, profiles(display_name, username, bio)")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const spotlights = (data ?? []) as unknown as TalentSpotlight[];

  return (
    <div className="py-8">
      <header className="border-b-2 border-ink pb-4">
        <h1 className="font-serif text-4xl font-bold">Talent</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          People an editor chose to put on the record. A spotlight is an
          assignment, not a signup.
        </p>
      </header>

      {spotlights.length === 0 ? (
        <p className="py-12 text-sm text-ink-soft">No spotlights yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-rule">
          {spotlights.map((item) => {
            const username = item.profiles?.username;
            const name = item.profiles?.display_name ?? "Member";
            return (
              <li key={item.id} className="py-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
                  {DISCIPLINE_LABELS[item.discipline] ?? item.discipline}
                </p>
                <h2 className="mt-1 font-serif text-2xl font-bold">
                  {username ? (
                    <Link href={`/talent/${username}`} className="hover:text-accent">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </h2>
                <p className="mt-2 font-serif text-lg leading-snug">{item.headline}</p>
                {item.blurb && (
                  <p className="mt-2 max-w-2xl text-sm text-ink-soft">{item.blurb}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
