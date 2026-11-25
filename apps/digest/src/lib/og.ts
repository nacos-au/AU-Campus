import { site } from "@/lib/site";

export function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "http://localhost:3001";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}

/** Absolute URL for the branded masthead OG image. Never uses personal avatars. */
export function brandOgImage(subtitle?: string | null): string {
  const u = new URL("/og", siteOrigin());
  if (subtitle?.trim()) u.searchParams.set("title", subtitle.trim().slice(0, 80));
  return u.toString();
}

export function socialMetadata(opts: {
  title: string;
  description?: string | null;
  /** Prefer article cover; fall back to brand card. Never pass avatar_url. */
  image?: string | null;
  brandSubtitle?: string | null;
  type?: "website" | "article";
}) {
  const image =
    opts.image?.trim() ||
    brandOgImage(opts.brandSubtitle ?? opts.title);

  return {
    openGraph: {
      title: opts.title,
      description: opts.description ?? site.tagline,
      images: [{ url: image, width: 1200, height: 630, alt: site.name }],
      type: opts.type ?? "website",
      siteName: site.name,
    },
    twitter: {
      card: "summary_large_image" as const,
      title: opts.title,
      description: opts.description ?? site.tagline,
      images: [image],
    },
  };
}
