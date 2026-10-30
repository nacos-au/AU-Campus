"use client";

import { PageHeader } from "@/components/admin/ui";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, ROLE_SUMMARIES } from "@/lib/roles";
import type { Profile, Role } from "@/lib/types";

const ASSIGNABLE: Role[] = ["reader", "writer", "editor", "admin"];

export function TeamManager({ currentUserId }: { currentUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const setRole = useMutation({
    mutationFn: async (vars: { id: string; role: Role }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: vars.role })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Team"
        description="Promote writers, appoint editors, and reserve admin for people who can change roles. No one can escalate their own access."
      />

      <div className="grid gap-3 border border-rule bg-gray-50/60 p-4 text-sm sm:grid-cols-2">
        {(Object.keys(ROLE_SUMMARIES) as Role[]).map((role) => (
          <div key={role}>
            <p className="text-xs font-bold uppercase tracking-wider">
              {ROLE_LABELS[role]}
            </p>
            <p className="mt-1 text-ink-soft">{ROLE_SUMMARIES[role]}</p>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-8 divide-y divide-rule">
          {people.map((p) => {
            const isSelf = p.id === currentUserId;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {p.display_name || "Unnamed"}
                    {isSelf && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                        you
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-soft">
                    Joined {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <select
                  value={p.role}
                  disabled={isSelf || setRole.isPending}
                  onChange={(e) =>
                    setRole.mutate({ id: p.id, role: e.target.value as Role })
                  }
                  className="border border-rule-dark px-3 py-1.5 text-sm disabled:opacity-50"
                  title={
                    isSelf
                      ? "You cannot change your own role"
                      : "Change this person's role"
                  }
                >
                  {ASSIGNABLE.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
