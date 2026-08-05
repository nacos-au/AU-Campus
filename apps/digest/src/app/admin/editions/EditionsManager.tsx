"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { uploadCover, uploadEditionPdf } from "@/lib/uploads";
import { formatNaira } from "@/lib/site";
import type { Edition } from "@/lib/types";

type EditionWithFile = Edition & {
  edition_files: { edition_id: string }[] | null;
};

export function EditionsManager() {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [priceNaira, setPriceNaira] = useState("500");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: editions = [], isLoading } = useQuery({
    queryKey: ["admin-editions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("editions")
        .select("*, edition_files(edition_id)")
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data as unknown as EditionWithFile[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-editions"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required.");
      const price = Math.round(Number(priceNaira) * 100);
      if (!Number.isFinite(price) || price < 0)
        throw new Error("Enter a valid price.");

      let cover_url: string | null = null;
      if (coverFile) cover_url = await uploadCover(supabase, coverFile, "editions");

      const { data: edition, error } = await supabase
        .from("editions")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          issue_date: issueDate || new Date().toISOString().slice(0, 10),
          price_kobo: price,
          cover_url,
        })
        .select()
        .single<Edition>();
      if (error) throw error;

      if (pdfFile) await attachPdf(edition.id, pdfFile);
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setIssueDate("");
      setCoverFile(null);
      setPdfFile(null);
      setError(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  async function attachPdf(editionId: string, file: File) {
    const pdf_path = await uploadEditionPdf(supabase, editionId, file);
    const { error } = await supabase
      .from("edition_files")
      .upsert({ edition_id: editionId, pdf_path });
    if (error) throw new Error(error.message);
  }

  async function onReplacePdf(editionId: string, file: File | undefined) {
    if (!file) return;
    setBusyId(editionId);
    setError(null);
    try {
      await attachPdf(editionId, file);
      invalidate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const togglePublish = useMutation({
    mutationFn: async (e: Edition) => {
      const { error } = await supabase
        .from("editions")
        .update({ published: !e.published })
        .eq("id", e.id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Editions</h1>

      {/* ── Create ── */}
      <div className="mt-6 border border-rule-dark p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          New edition
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title, e.g. Vol. 12, No. 5 — Exam Season Special"
            className="border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none sm:col-span-2"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown in the store"
            rows={2}
            className="border border-rule-dark px-3 py-2 text-sm focus:border-ink focus:outline-none sm:col-span-2"
          />
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Issue date
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Price (₦)
            <input
              type="number"
              min="0"
              value={priceNaira}
              onChange={(e) => setPriceNaira(e.target.value)}
              className="mt-1 block w-full border border-rule-dark px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Cover image
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Edition PDF
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
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
          {create.isPending ? "Creating…" : "Create edition"}
        </button>
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-8 divide-y divide-rule">
          {editions.map((e) => {
            const hasFile = (e.edition_files?.length ?? 0) > 0;
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden border border-rule-dark bg-rule">
                  {e.cover_url && (
                    <Image
                      src={e.cover_url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif font-bold">{e.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {e.issue_date} · {formatNaira(e.price_kobo)} ·{" "}
                    {hasFile ? (
                      <span className="text-green-700">PDF uploaded</span>
                    ) : (
                      <span className="text-red-700">No PDF yet</span>
                    )}
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    e.published
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {e.published ? "On sale" : "Hidden"}
                </span>

                <div className="flex items-center gap-3 text-xs font-semibold">
                  <label className="cursor-pointer text-ink-soft underline hover:text-ink">
                    {busyId === e.id
                      ? "Uploading…"
                      : hasFile
                        ? "Replace PDF"
                        : "Upload PDF"}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={busyId === e.id}
                      onChange={(ev) =>
                        onReplacePdf(e.id, ev.target.files?.[0])
                      }
                    />
                  </label>
                  {hasFile && (
                    <Link
                      href={`/read/${e.id}`}
                      className="text-ink-soft underline hover:text-ink"
                    >
                      Preview
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      if (
                        !confirm(
                          e.published
                            ? `Admin action: take "${e.title}" off sale?`
                            : `Admin action: put "${e.title}" on sale for readers?`
                        )
                      )
                        return;
                      togglePublish.mutate(e);
                    }}
                    className={`px-2.5 py-1 transition-colors ${
                      e.published
                        ? "border border-ink hover:bg-ink hover:text-paper"
                        : "bg-ink text-paper hover:bg-accent"
                    }`}
                  >
                    {e.published ? "Take off sale" : "Put on sale"}
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
