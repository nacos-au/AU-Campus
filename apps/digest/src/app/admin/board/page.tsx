import Link from "next/link";
import { createAuthClient } from "@/lib/supabase/auth-client";
import { requireRole } from "@/lib/auth";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import type { WriterEngagementRow } from "@/lib/types";

export default async function NewsroomBoardPage() {
  const { profile } = await requireRole("writer");
  const supabase = await createAuthClient();

  const [{ data: boardData, error }, published] = await Promise.all([
    supabase.rpc("writer_engagement_board"),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);

  const rows = (boardData ?? []) as WriterEngagementRow[];
  const teamLive = published.count ?? 0;
  const me = profile.id;

  return (
    <div>
      <PageHeader
        eyebrow="Newsroom"
        title="Board"
        description="How many stories we’ve put out — and who’s shipping. Co-authored pieces count for everyone on the byline."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label="Articles posted" value={teamLive} href="/admin/articles?filter=published" />
        <Stat
          label="Writers on the board"
          value={rows.length}
        />
        <Stat
          label="Your live pieces"
          value={rows.find((r) => r.user_id === me)?.live_articles ?? 0}
        />
      </div>

      <Card title="Leaderboard">
        {error ? (
          <p className="text-sm text-accent">
            {error.message.includes("does not exist") ||
            error.message.includes("Could not find")
              ? "Board data isn’t available yet. Apply digest_writer_stats_APPLY_ALL.sql in Supabase."
              : error.message}
          </p>
        ) : rows.length === 0 ? (
          <Empty
            title="No live articles yet"
            body="Publish the first piece and the board will light up."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                  <th className="pb-2 pr-3 font-bold">Rank</th>
                  <th className="pb-2 pr-3 font-bold">Writer</th>
                  <th className="pb-2 pr-3 text-right font-bold">Articles</th>
                  <th className="pb-2 pr-3 text-right font-bold">Likes</th>
                  <th className="pb-2 text-right font-bold">Saves</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r, i) => {
                  const isMe = r.user_id === me;
                  const name = (
                    <span className={isMe ? "font-bold text-ink" : "font-semibold text-ink"}>
                      {r.display_name}
                      {isMe ? " · you" : ""}
                    </span>
                  );
                  return (
                    <tr
                      key={r.user_id}
                      className={isMe ? "bg-accent-soft/40" : undefined}
                    >
                      <td className="py-3 pr-3 tabular-nums text-ink-soft">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-3">
                        {r.username ? (
                          <Link
                            href={`/author/${r.username}`}
                            className="hover:text-accent"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums font-semibold">
                        {r.live_articles}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-ink-soft">
                        {r.likes_received}
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink-soft">
                        {r.saves_received}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
