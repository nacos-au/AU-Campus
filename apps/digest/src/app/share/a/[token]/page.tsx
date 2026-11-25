import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ImageInfo } from "@/components/ImageInfo";
import { RichText } from "@/components/RichText";
import { digestFeatures } from "@/lib/features";
import { requireRole } from "@/lib/auth";
import { socialMetadata } from "@/lib/og";
import { site } from "@/lib/site";
import { createAuthClient } from "@/lib/supabase/auth-client";

export const metadata: Metadata = {
  title: "Private draft",
  description: `Shared draft · ${site.name}`,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  ...socialMetadata({
    title: `Private draft · ${site.name}`,
    description: `Shared draft · ${site.name}`,
    brandSubtitle: "Private draft",
  }),
};

interface ShareView {
  article_id?: string;
  mode?: "live" | "snapshot";
  status?: string;
  slug?: string;
  redirect_slug?: string;
  section_name?: string | null;
  title?: string;
  dek?: string | null;
  body?: unknown;
  cover_url?: string | null;
  cover_caption?: string | null;
  byline?: string | null;
  captured_at?: string | null;
}

export default async function ShareDraftPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!digestFeatures.draftShare) notFound();

  await requireRole("reader");
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc("open_article_share_link", {
    p_token: token,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-serif text-2xl font-bold">Link unavailable</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {error.message.includes("Could not find") ||
          error.message.includes("function")
            ? "Private sharing is not set up on this database yet."
            : error.message}
        </p>
        <Link
          href="/admin/articles"
          className="mt-6 inline-block text-xs font-semibold uppercase tracking-wider text-accent underline"
        >
          Back to articles
        </Link>
      </div>
    );
  }

  const view = data as ShareView;
  if (view.redirect_slug) {
    redirect(`/article/${view.redirect_slug}`);
  }
  if (!view.title) notFound();

  const isSnap = view.mode === "snapshot";
  const captured =
    view.captured_at && !Number.isNaN(Date.parse(view.captured_at))
      ? new Date(view.captured_at).toLocaleString()
      : null;

  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-accent bg-accent-soft px-4 py-2.5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
          {isSnap
            ? `Private draft — frozen copy${captured ? ` from ${captured}` : ""}`
            : "Private draft — viewing live updates"}
          {" · "}
          View only
        </p>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-8">
        {view.section_name && (
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            {view.section_name}
          </p>
        )}
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
          {view.title}
        </h1>
        {view.dek && (
          <p className="mt-4 font-serif text-xl leading-snug text-ink-soft">
            {view.dek}
          </p>
        )}
        {view.byline && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            By {view.byline}
          </p>
        )}
        {view.cover_url && (
          <figure className="mt-6">
            <ImageInfo
              description={view.cover_caption}
              className="aspect-video w-full overflow-hidden bg-rule"
            >
              <Image
                src={view.cover_url}
                alt={view.cover_caption?.trim() || view.title || ""}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
            </ImageInfo>
          </figure>
        )}
        <div className="mt-8">
          <RichText doc={view.body} />
        </div>
      </article>
    </div>
  );
}
