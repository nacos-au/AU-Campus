"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { PhantomIcon } from "@/components/phantom/phantom-icon";
import {
  getPhantomSessionLocal,
  savePhantomSessionLocal,
} from "@/lib/phantom/store";
import { PHANTOM_BRAND, type PhantomSession } from "@/lib/phantom/types";

export function PhantomSharePreview({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<PhantomSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const ogSrc = `${PHANTOM_BRAND.path}/${sessionId}/opengraph-image`;
  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${PHANTOM_BRAND.path}/${sessionId}`
      : `${PHANTOM_BRAND.path}/${sessionId}`;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = getPhantomSessionLocal(sessionId);
      if (local && !cancelled) setSession(local);

      try {
        const res = await fetch(`/api/phantom/${sessionId}`);
        if (res.ok) {
          const json = (await res.json()) as { session?: PhantomSession };
          if (json.session && !cancelled) {
            setSession(json.session);
            savePhantomSessionLocal(json.session);
          }
        } else if (!local && !cancelled) {
          setSession(null);
        }
      } catch {
        /* keep local */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function fetchCardBlob(): Promise<Blob> {
    const res = await fetch(ogSrc);
    if (!res.ok) throw new Error("Could not generate the results card image.");
    return res.blob();
  }

  async function shareCard() {
    if (!session) return;
    setBusy(true);
    setMessage("");
    const url = `${window.location.origin}${PHANTOM_BRAND.path}/${session.id}`;
    const leader = session.standings[0];
    const text = leader
      ? `${session.title} — ${leader.team_name} leads on ${leader.points} pts`
      : `${session.title} — ${PHANTOM_BRAND.tagline}`;

    try {
      const blob = await fetchCardBlob();
      const file = new File([blob], `phantom-${session.code}.png`, { type: "image/png" });
      const payload: ShareData = { title: session.title, text, url, files: [file] };
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        setMessage("Shared results card + link.");
      } else if (navigator.share) {
        await navigator.share({ title: session.title, text, url });
        setMessage("Shared link. Download the card image to attach manually if needed.");
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setMessage("Link copied. Use Download card to save the preview image.");
        setTimeout(() => setCopied(false), 1600);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Share failed — try Download card.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadCard() {
    setBusy(true);
    setMessage("");
    try {
      const blob = await fetchCardBlob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `phantom-${session?.code ?? sessionId}.png`;
      a.click();
      URL.revokeObjectURL(href);
      setMessage("Results card downloaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}${PHANTOM_BRAND.path}/${sessionId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setMessage("Link copied — messaging apps show the OG preview card.");
    setTimeout(() => setCopied(false), 1600);
  }

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm opacity-60">Loading share preview…</p>;
  }

  if (!session) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="font-display text-lg font-bold">Phantom not found</p>
        <Link href={PHANTOM_BRAND.path} className="mt-3 inline-block text-sm font-bold text-accent hover:underline">
          Back to Phantom
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
          <PhantomIcon size={22} className="text-white" />
        </div>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-accent/50">
            Share preview · {session.code}
          </p>
          <h1 className="font-display text-2xl font-extrabold text-accent">{session.title}</h1>
          <p className="text-sm text-accent/60">
            This is the Open Graph card people see when you paste the link.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rule bg-black shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogSrc}
          alt={`${session.title} results card`}
          className="h-auto w-full"
          width={1200}
          height={630}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void shareCard()}
          className="btn-filled inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 font-display text-sm font-bold text-white disabled:opacity-40"
        >
          <Share2 className="h-4 w-4" />
          Share card + link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void downloadCard()}
          className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2.5 font-display text-sm font-bold disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Download card
        </button>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2.5 font-display text-sm font-bold"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <Link
          href={`${PHANTOM_BRAND.path}/${session.id}`}
          className="inline-flex items-center rounded-full border border-rule px-4 py-2.5 font-display text-sm font-bold"
        >
          Back to session
        </Link>
      </div>

      {message && (
        <p className="mt-4 rounded-lg border border-rule bg-surface px-3 py-2 text-xs font-semibold text-accent">
          {message}
        </p>
      )}

      <p className="mt-6 text-xs opacity-50">
        Preview URL for crawlers: {pageUrl}
      </p>
    </div>
  );
}
