"use client";

import { PageHeader } from "@/components/admin/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uploadCover } from "@/lib/uploads";
import { isLive, SLOT_DIMENSIONS, SLOT_INFO } from "@/lib/ads";
import { formatNaira } from "@/lib/site";
import type { Ad, AdSlot, AdStatus } from "@/lib/types";

const SLOTS: AdSlot[] = ["leaderboard", "sidebar", "infeed"];

const STATUS_STYLES: Record<AdStatus, string> = {
  pending_payment: "bg-gray-100 text-gray-700",
  pending_review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
};
const STATUS_LABELS: Record<AdStatus, string> = {
  pending_payment: "Unpaid",
  pending_review: "Needs review",
  approved: "Approved",
  rejected: "Rejected",
};

const field =
  "mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
const label = "text-xs font-semibold uppercase tracking-wide text-ink-soft";

function fmtDate(s?: string | null) {
  return s ? new Date(s).toLocaleDateString() : "—";
}

export function AdsManager() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [slot, setSlot] = useState<AdSlot>("leaderboard");
  const [labelText, setLabelText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [weight, setWeight] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "review" | "live">("all");
  const { confirm } = useConfirm();

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
        label: labelText.trim() || "Advertisement",
        advertiser_name: labelText.trim() || null,
        target_url: targetUrl.trim(),
        image_url,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        weight,
        status: "approved",
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabelText("");
      setTargetUrl("");
      setStartsAt("");
      setEndsAt("");
      setWeight(1);
      setImageFile(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const patch = useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<Ad> }) => {
      const { error } = await supabase.from("ads").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onError: (e: Error) => setError(e.message),
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const reviewCount = ads.filter((a) => a.status === "pending_review").length;
  const visible = ads.filter((a) =>
    tab === "all" ? true : tab === "review" ? a.status === "pending_review" : isLive(a)
  );

  const totals = ads.reduce(
    (acc, a) => {
      acc.imp += a.impressions ?? 0;
      acc.clk += a.clicks ?? 0;
      if (a.paid_at) acc.rev += a.price_kobo ?? 0;
      return acc;
    },
    { imp: 0, clk: 0, rev: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Advertising"
        description="Direct bookings from campus businesses, house ads, and what they earn."
        action={
          <Link href="/advertise" className="text-xs font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline">
            Public rate card →
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Ad revenue", formatNaira(totals.rev)],
          ["Impressions", totals.imp.toLocaleString()],
          ["Clicks", totals.clk.toLocaleString()],
        ].map(([k, v]) => (
          <div key={k} className="border border-rule p-3 sm:p-4">
            <p className="font-serif text-xl font-bold sm:text-2xl">{v}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft sm:text-xs">
              {k}
            </p>
          </div>
        ))}
      </div>

      <details className="mt-6 border border-rule bg-gray-50/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold uppercase tracking-wider">
          New house ad
        </summary>
        <div className="border-t border-rule p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={label}>
              Placement
              <select value={slot} onChange={(e) => setSlot(e.target.value as AdSlot)} className={field}>
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {SLOT_INFO[s].name} ({SLOT_DIMENSIONS[s].w}×{SLOT_DIMENSIONS[s].h}) — {SLOT_INFO[s].where}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              Advertiser / label
              <input value={labelText} onChange={(e) => setLabelText(e.target.value)} placeholder="Campus Bookshop" className={field} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Target URL
              <input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://…" className={field} />
            </label>
            <label className={label}>
              Starts (optional)
              <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </label>
            <label className={label}>
              Ends (optional)
              <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={field} />
            </label>
            <label className={label}>
              Weight (1–10, share of rotation)
              <input type="number" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value) || 1)} className={field} />
            </label>
            <label className={label}>
              Creative image
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
            </label>
          </div>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="mt-4 bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create ad"}
          </button>
        </div>
      </details>

      {error && (
        <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <div className="mt-8 flex gap-1 border-b border-rule pb-3 text-xs font-semibold">
        {(
          [
            ["all", "All"],
            ["review", `Needs review (${reviewCount})`],
            ["live", "Live now"],
          ] as const
        ).map(([id, text]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 uppercase tracking-wide ${
              tab === id ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-soft">Nothing here.</p>
      ) : (
        <div className="divide-y divide-rule">
          {visible.map((ad) => {
            const status = ad.status ?? "approved";
            const live = isLive(ad);
            const ctr =
              (ad.impressions ?? 0) > 0
                ? (((ad.clicks ?? 0) / (ad.impressions ?? 1)) * 100).toFixed(1) + "%"
                : "—";
            return (
              <div key={ad.id} className="py-4">
                <div className="flex gap-3">
                  <a href={ad.image_url} target="_blank" rel="noreferrer" className="relative h-14 w-24 shrink-0 overflow-hidden border border-rule-dark bg-rule">
                    <Image src={ad.image_url} alt={ad.label} fill sizes="96px" className="object-cover" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{ad.advertiser_name || ad.label}</p>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {status === "approved" && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${live ? "text-green-700" : "text-ink-soft"}`}>
                          {!ad.active ? "Paused" : live ? "● Live" : "Scheduled / ended"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {SLOT_INFO[ad.slot].name} · {fmtDate(ad.starts_at)} → {fmtDate(ad.ends_at)}
                      {ad.price_kobo ? ` · ${formatNaira(ad.price_kobo)}${ad.paid_at ? " paid" : " unpaid"}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {(ad.impressions ?? 0).toLocaleString()} views · {(ad.clicks ?? 0).toLocaleString()} clicks · CTR {ctr}
                      {ad.contact_email ? ` · ${ad.contact_email}` : ""}
                    </p>
                    <a href={ad.target_url} target="_blank" rel="noreferrer" className="mt-0.5 block truncate text-xs text-ink-soft underline">
                      {ad.target_url}
                    </a>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold">
                  {status === "pending_review" && (
                    <>
                      <button
                        onClick={() => patch.mutate({ id: ad.id, patch: { status: "approved", active: true } })}
                        className="bg-green-700 px-3 py-1.5 text-white hover:bg-green-800"
                      >
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Reject this creative?",
                              body: "The advertiser has paid — refund them from the Paystack dashboard.",
                              confirmLabel: "Reject",
                              danger: true,
                            })
                          )
                            patch.mutate({ id: ad.id, patch: { status: "rejected", active: false } });
                        }}
                        className="border border-red-700 px-3 py-1.5 text-red-700 hover:bg-red-700 hover:text-white"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {status === "approved" && (
                    <button
                      onClick={() => patch.mutate({ id: ad.id, patch: { active: !ad.active } })}
                      className="border border-ink px-2.5 py-1 hover:bg-ink hover:text-paper transition-colors"
                    >
                      {ad.active ? "Pause" : "Resume"}
                    </button>
                  )}
                  {status === "approved" && (
                    <label className="flex items-center gap-1 text-ink-soft">
                      Weight
                      <input
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={ad.weight ?? 1}
                        onBlur={(e) => {
                          const w = Number(e.target.value);
                          if (w >= 1 && w <= 10 && w !== ad.weight) patch.mutate({ id: ad.id, patch: { weight: w } });
                        }}
                        className="w-12 border border-rule-dark px-1 py-0.5 text-xs"
                      />
                    </label>
                  )}
                  <button
                    onClick={async () => {
                      if (
                        await confirm({
                          title: `Delete ad “${ad.label}”?`,
                          confirmLabel: "Delete",
                          danger: true,
                        })
                      )
                        remove.mutate(ad.id);
                    }}
                    className="text-red-700 underline hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
