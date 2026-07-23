import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { formatNaira } from "@/lib/site";
import { ROLE_SUMMARIES } from "@/lib/roles";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { profile } = await getSessionProfile();
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");

  const [published, submitted, drafts, editions, purchases] =
    await Promise.all([
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase.from("editions").select("id", { count: "exact", head: true }),
      isAdmin
        ? supabase.from("purchases").select("amount_kobo")
        : Promise.resolve({ data: null }),
    ]);

  const revenue = (purchases.data ?? []).reduce(
    (sum, p) => sum + p.amount_kobo,
    0
  );

  const cards = [
    {
      label: "Published articles",
      value: published.count ?? 0,
      href: "/admin/articles",
    },
    {
      label: "Awaiting review",
      value: submitted.count ?? 0,
      href: "/admin/articles?status=submitted",
      accent: (submitted.count ?? 0) > 0,
    },
    {
      label: "Drafts",
      value: drafts.count ?? 0,
      href: "/admin/articles?status=draft",
    },
    {
      label: "Editions",
      value: editions.count ?? 0,
      href: staff ? "/admin/editions" : "/admin",
    },
  ];

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
      {profile && (
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Signed in as <span className="font-semibold text-ink">{profile.role}</span>
          {" — "}
          {ROLE_SUMMARIES[profile.role]}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`border p-5 transition-colors hover:border-ink ${
              c.accent ? "border-accent bg-accent-soft" : "border-rule-dark"
            }`}
          >
            <p className="text-3xl font-bold font-serif">{c.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {c.label}
            </p>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <div className="mt-4 border border-rule-dark p-5">
          <p className="text-3xl font-bold font-serif">
            {formatNaira(revenue)}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Edition sales · {(purchases.data ?? []).length} purchases
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/articles/new"
          className="bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-accent-hover transition-colors"
        >
          Write a new article
        </Link>
        {staff && (
          <Link
            href="/admin/sections"
            className="border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors"
          >
            Manage sections
          </Link>
        )}
        {isAdmin && (
          <Link
            href="/admin/team"
            className="border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors"
          >
            Manage team
          </Link>
        )}
        <Link
          href="/"
          className="border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-ink hover:text-paper transition-colors"
        >
          View the paper
        </Link>
      </div>
    </div>
  );
}
