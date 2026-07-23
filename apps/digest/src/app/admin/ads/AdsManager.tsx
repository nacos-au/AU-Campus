"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uploadCover } from "@/lib/uploads";
import type { Ad, AdSlot } from "@/lib/types";

const SLOTS: { value: AdSlot; label: string }[] = [
  { value: "leaderboard", label: "Leaderboard (970×250, homepage & sections)" },
  { value: "sidebar", label: "Sidebar (300×600, homepage rail)" },
  { value: "infeed", label: "In-feed (600×400, articles & sections)" },
];

export function AdsManager() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [slot, setSlot] = useState<AdSlot>("leaderboard");
  const [label, setLabel] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-ads"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!imageFile) throw new Error("An ad creative image is required.");
      if (!targetUrl.trim()) throw new Error("A target URL is required.");
      const image_url = await uploadCover(supabase, imageFile, "ads");
      const { error } = await supabase.from("ads").insert({
        slot,
        label: label.trim() || "Advertisement",
        target_url: targetUrl.trim(),
        image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      setTargetUrl("");
      setImageFile(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (ad: Ad) => {
      const { error } = await supabase
        .from("ads")
        .update({ active: !ad.active })
        .eq("id", ad.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Advertising</h1>

      <div className="mt-6 border border-rule-dark p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">New ad</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Placement
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value as AdSlot)}
              className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            >
              {SLOTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Advertiser / label
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Campus Bookshop"
              className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Target URL
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Creative image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
            {error}
          </p>
        )}

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="mt-4 bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create ad"}
        </button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-8 divide-y divide-rule">
          {ads.map((ad) => (
            <div key={ad.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="relative h-16 w-28 shrink-0 overflow-hidden border border-rule-dark bg-rule">
                <Image
                  src={ad.image_url}
                  alt={ad.label}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{ad.label}</p>
                <p className="mt-0.5 truncate text-xs text-ink-soft">
                  {ad.slot} · {ad.target_url}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  ad.active
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {ad.active ? "Active" : "Paused"}
              </span>
              <div className="flex gap-3 text-xs font-semibold">
                <button
                  onClick={() => toggle.mutate(ad)}
                  className="border border-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
                >
                  {ad.active ? "Pause" : "Activate"}
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ad "${ad.label}"?`)) remove.mutate(ad.id);
                  }}
                  className="text-red-700 underline hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
