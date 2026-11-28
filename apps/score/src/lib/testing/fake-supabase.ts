import type { Supabase } from "@/lib/data/sport-ids";

export const FOOTBALL_UUID = "9b1e0c2a-1111-4222-8333-444455556666";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface QueryCall {
  table: string;
  eq: Record<string, unknown>;
  in: Record<string, unknown[]>;
  or: string[];
}

export type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * Minimal Supabase stand-in for query tests. Like Postgres, a non-UUID value
 * for a `*sport_id` filter returns an error instead of matching nothing, which
 * is how slug-in-UUID-column bugs show up on live. The `sports` lookup used by
 * resolveSportUuid always resolves to FOOTBALL_UUID.
 */
export function fakeSupabase(handlers: Record<string, (call: QueryCall) => QueryResult>) {
  const calls: QueryCall[] = [];

  const from = (table: string) => {
    const call: QueryCall = { table, eq: {}, in: {}, or: [] };
    const api = {
      select: () => api,
      is: () => api,
      limit: () => api,
      order: () => api,
      eq: (col: string, val: unknown) => {
        call.eq[col] = val;
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        call.in[col] = vals;
        return api;
      },
      or: (clause: string) => {
        call.or.push(clause);
        return api;
      },
      maybeSingle: async () =>
        table === "sports"
          ? { data: { id: FOOTBALL_UUID, name: "Football" }, error: null }
          : { data: null, error: null },
      then: (resolve: (v: QueryResult) => void) => {
        calls.push(call);
        for (const [col, val] of Object.entries(call.eq)) {
          if (col.endsWith("sport_id") && typeof val === "string" && !UUID.test(val)) {
            return resolve({
              data: null,
              error: { message: `invalid input syntax for type uuid: "${val}"` },
            });
          }
        }
        const handler = handlers[table];
        return resolve(handler ? handler(call) : { data: null, error: null });
      },
    };
    return api;
  };

  return {
    client: { from } as unknown as Supabase,
    callsFor: (table: string) => calls.filter((c) => c.table === table),
  };
}
