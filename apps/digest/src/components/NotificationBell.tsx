"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";

export function NotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, article_id, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as AppNotification[];
    },
  });

  const unread = items.filter((n) => !n.read_at).length;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next && unread > 0) {
      await supabase.rpc("mark_notifications_read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  async function close() {
    setOpen(false);
    if (unread > 0) {
      await supabase.rpc("mark_notifications_read");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center text-ink"
      >
        <Bell className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={close}
          />
          <div className="fixed inset-x-2 top-24 z-50 max-h-[70vh] overflow-y-auto border border-rule-dark bg-paper shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80">
            <p className="border-b border-rule px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Notifications
            </p>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-soft">
                You&rsquo;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-rule">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.article_id ? `/admin/review/${n.article_id}` : "/admin"}
                      onClick={close}
                      className={`block px-4 py-3 text-sm hover:bg-gray-50 ${
                        n.read_at ? "text-ink-soft" : "font-semibold text-ink"
                      }`}
                    >
                      {n.body}
                      <span className="mt-0.5 block text-[11px] font-normal text-ink-soft">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
