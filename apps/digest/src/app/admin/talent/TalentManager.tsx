"use client";

import { PageHeader } from "@/components/admin/ui";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile, TalentDiscipline, TalentSpotlight } from "@/lib/types";

const DISCIPLINES: TalentDiscipline[] = [
  "design",
  "development",
  "writing",
  "debate",
  "other",
];

export function TalentManager() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [profileId, setProfileId] = useState("");
  const [discipline, setDiscipline] = useState<TalentDiscipline>("writing");
  const [headline, setHeadline] = useState("");
  const [blurb, setBlurb] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ["talent-people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .order("display_name")
        .limit(200);
      if (error) throw error;
      return data as Pick<Profile, "id" | "display_name" | "username">[];
    },
  });

  const { data: spotlights = [], isLoading } = useQuery({
    queryKey: ["talent-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_spotlights")
        .select("*, profiles(display_name, username, bio)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as TalentSpotlight[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["talent-admin"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Choose a person.");
      if (!headline.trim()) throw new Error("A headline is required.");
      const { error } = await supabase.from("talent_spotlights").upsert(
        {
          profile_id: profileId,
          discipline,
          headline: headline.trim(),
          blurb: blurb.trim() || null,
          published: true,
        },
        { onConflict: "profile_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setHeadline("");
      setBlurb("");
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (vars: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("talent_spotlights")
        .update({ published: vars.published })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Talent"
        description="Spotlights on students doing remarkable work. A spotlight does not change anyone’s role."
      />

      <form
        className="space-y-3 border border-rule bg-gray-50/60 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="flex flex-wrap gap-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Person
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="mt-1 block border border-rule-dark px-3 py-2 text-sm text-ink"
            >
              <option value="">Choose…</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.display_name}
                  {person.username ? ` (@${person.username})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Discipline
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as TalentDiscipline)}
              className="mt-1 block border border-rule-dark px-3 py-2 text-sm text-ink"
            >
              {DISCIPLINES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Headline"
          className="w-full border border-rule-dark px-3 py-2 font-serif text-lg"
        />
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          placeholder="Short blurb"
          rows={3}
          className="w-full border border-rule-dark px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={create.isPending}
          className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50"
        >
          Publish spotlight
        </button>
      </form>

      {isLoading ? (
        <p className="py-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <ul className="mt-8 divide-y divide-rule">
          {spotlights.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-serif font-bold">
                  {item.profiles?.display_name} · {item.headline}
                </p>
                <p className="text-xs uppercase tracking-wide text-ink-soft">
                  {item.discipline} · {item.published ? "published" : "hidden"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle.mutate({ id: item.id, published: !item.published })}
                className="text-xs font-semibold underline"
              >
                {item.published ? "Unpublish" : "Publish"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
