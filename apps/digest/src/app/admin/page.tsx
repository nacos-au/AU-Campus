import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { getSessionProfile, hasRole } from "@/lib/auth";
import { articlePublicPath } from "@/lib/articles";
import { digestFeatures } from "@/lib/features";
import { formatNaira } from "@/lib/site";
import { Card, Empty, Pill, Stat, btn } from "@/components/admin/ui";

interface Row {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  author_id: string;
  assigned_editor_id: string | null;
  slug: string;
  short_code?: string | null;
  sections: { name: string } | null;
  profiles: { display_name: string } | null;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}

export default async function AdminDashboard() {
  const supabase = await createAuthClient();
  const { profile } = await getSessionProfile();
  if (!profile) return null;
  const staff = hasRole(profile, "editor");
  const isAdmin = hasRole(profile, "admin");
  const me = profile.id;

  const [articlesRes, published, editions, purchases, ads] = await Promise.all([
    supabase
      .from("articles")
      .select(
        "id, title, status, updated_at, author_id, assigned_editor_id, slug, short_code, sections(name), profiles!articles_author_id_fkey(display_name)"
      )
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    supabase.from("editions").select("id", { count: "exact", head: true }),
    isAdmin ? supabase.from("purchases").select("amount_kobo") : Promise.resolve({ data: null }),
    staff && digestFeatures.manualAds
      ? supabase.from("ads").select("id", { count: "exact", head: true }).eq("status", "pending_review")
      : Promise.resolve({ count: 0 }),
  ]);

  const rows = (articlesRes.data ?? []) as unknown as Row[];
  const forMe = rows.filter(
    (r) => r.status === "awaiting_editor" && r.assigned_editor_id === me
  );
  const mine = rows.filter((r) => r.author_id === me);
  // Writers: only own work. Staff: full desk recent (RLS already hides others' drafts).
  const deskRows = staff ? rows : mine;
  const needsMyChanges = mine.filter((r) => r.status === "awaiting_writer");
  const myDrafts = mine.filter((r) => r.status === "draft");
  const withEditor = mine.filter((r) => r.status === "awaiting_editor");
  const recent = deskRows.slice(0, 6);

  const revenue = (purchases.data ?? []).reduce(
    (s: number, p: { amount_kobo: number }) => s + p.amount_kobo,
    0
  );
  const pendingAds = (ads as { count?: number | null }).count ?? 0;
  const firstName = profile.display_name.split(" ")[0] || "there";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(new Date())}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {greeting()}, {firstName}.
          </h1>
        </div>
        <Link href="/admin/articles/new" className={btn.primary}>
          + New article
        </Link>
      </div>

      {/* Attention */}
      {(forMe.length > 0 || needsMyChanges.length > 0 || pendingAds > 0) && (
        <Card title="Needs your attention" className="mb-6">
          <ul className="divide-y divide-rule">
            {forMe.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-serif font-bold">{r.title || "Untitled"}</p>
                  <p className="text-xs text-ink-soft">
                    {r.author_id === me ? "You (author)" : r.profiles?.display_name} · {r.sections?.name} · {ago(r.updated_at)}
                  </p>
                </div>
                <Link href={`/admin/review/${r.id}`} className={btn.primary}>
                  Review
                </Link>
              </li>
            ))}
            {needsMyChanges.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-serif font-bold">{r.title || "Untitled"}</p>
                  <p className="text-xs text-ink-soft">
                    Editor requested changes · {ago(r.updated_at)}
                  </p>
                </div>
                <Link href={`/admin/review/${r.id}`} className={btn.secondary}>
                  See notes
                </Link>
              </li>
            ))}
            {pendingAds > 0 && (
              <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-serif font-bold">
                    {pendingAds} ad creative{pendingAds === 1 ? "" : "s"} awaiting approval
                  </p>
                  <p className="text-xs text-ink-soft">Paid bookings go live once approved.</p>
                </div>
                <Link href="/admin/ads" className={btn.secondary}>
                  Open
                </Link>
              </li>
            )}
          </ul>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Live stories" value={published.count ?? 0} href="/admin/articles?status=published" />
        <Stat
          label={staff ? "Awaiting review" : "With editor"}
          value={staff ? rows.filter((r) => r.status === "awaiting_editor").length : withEditor.length}
          href="/admin/articles"
          accent={forMe.length > 0}
        />
        <Stat label="My drafts" value={myDrafts.length} href="/admin/articles" />
        {isAdmin ? (
          <Stat label="Edition sales" value={formatNaira(revenue)} hint={`${(purchases.data ?? []).length} purchases`} href="/admin/editions" />
        ) : staff ? (
          <Stat label="Editions" value={editions.count ?? 0} href="/admin/editions" />
        ) : (
          <Stat label="Needs changes" value={needsMyChanges.length} href="/admin/articles?filter=awaiting_writer" accent={needsMyChanges.length > 0} />
        )}
      </div>

      {/* Recent */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card
          title={staff ? "Recent activity" : "My recent work"}
          action={
            <Link href="/admin/articles" className={btn.ghost}>
              All articles →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <Empty
              title="Nothing yet"
              body="Your first story is a click away."
              action={
                <Link href="/admin/articles/new" className={btn.primary}>
                  Write something
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-rule">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link
                      href={
                        r.status === "published"
                          ? articlePublicPath(r)
                          : `/admin/articles/${r.id}/edit`
                      }
                      className="block truncate font-serif font-bold hover:text-accent"
                    >
                      {r.title || "Untitled"}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {r.profiles?.display_name} · {ago(r.updated_at)}
                    </p>
                  </div>
                  <Pill
                    tone={
                      r.status === "published"
                        ? "ok"
                        : r.status === "awaiting_editor"
                          ? "warn"
                          : r.status === "awaiting_writer"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {r.status === "published"
                      ? "Live"
                      : r.status === "awaiting_editor"
                        ? "With editor"
                        : r.status === "awaiting_writer"
                          ? "Needs changes"
                          : "Draft"}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Shortcuts">
          <ul className="space-y-1 text-sm">
            <li>
              <Link href="/admin/articles/new" className="block py-1.5 font-semibold hover:text-accent">
                Write a new article
              </Link>
            </li>
            <li>
              <Link href="/admin/articles" className="block py-1.5 font-semibold hover:text-accent">
                My articles
              </Link>
            </li>
            {staff && (
              <>
                <li>
                  <Link href="/admin/front-page" className="block py-1.5 font-semibold hover:text-accent">
                    Front page desk
                  </Link>
                </li>
                <li>
                  <Link href="/admin/weekly" className="block py-1.5 font-semibold hover:text-accent">
                    Build this week’s issue
                  </Link>
                </li>
                <li>
                  <Link href="/admin/sections" className="block py-1.5 font-semibold hover:text-accent">
                    Manage sections
                  </Link>
                </li>
                {digestFeatures.manualAds && (
                  <li>
                    <Link href="/admin/ads" className="block py-1.5 font-semibold hover:text-accent">
                      Advertising &amp; bookings
                    </Link>
                  </li>
                )}
                <li>
                  <Link href="/weekly" className="block py-1.5 font-semibold hover:text-accent">
                    Preview this week’s issue
                  </Link>
                </li>
              </>
            )}
            {isAdmin && (
              <li>
                <Link href="/admin/team" className="block py-1.5 font-semibold hover:text-accent">
                  Team &amp; roles
                </Link>
              </li>
            )}
          </ul>
          <p className="mt-5 border-t border-rule pt-4 text-xs leading-relaxed text-ink-soft">
            You’re signed in as <span className="font-semibold text-ink">{profile.role}</span>.{" "}
            {staff
              ? "You can review and publish other writers’ work."
              : "Submit your drafts to an editor to publish."}
          </p>
        </Card>
      </div>
    </div>
  );
}
