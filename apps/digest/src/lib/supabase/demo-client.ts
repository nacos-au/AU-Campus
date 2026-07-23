import "server-only";
import { demoTables } from "@/lib/demo-data";

/**
 * A read-only stand-in for the Supabase client used in DEMO_MODE.
 * Implements just the query-builder surface the public pages call
 * (select / eq / neq / order / limit / single / maybeSingle) over the
 * in-memory fixtures, so the site renders fully populated with no database.
 */

type Row = Record<string, unknown>;
type Result = { data: unknown; error: null | { message: string }; count: number | null };

function compare(a: unknown, b: unknown): number {
  const na = typeof a === "boolean" ? Number(a) : a;
  const nb = typeof b === "boolean" ? Number(b) : b;
  if (na === nb) return 0;
  if (na === null || na === undefined) return 1;
  if (nb === null || nb === undefined) return -1;
  return (na as never) < (nb as never) ? -1 : 1;
}

class DemoQueryBuilder implements PromiseLike<Result> {
  private filters: ((row: Row) => boolean)[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private mode: "many" | "single" | "maybeSingle" = "many";
  private headOnly = false;

  constructor(private rows: Row[]) {}

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.head) this.headOnly = true;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(count: number) {
    this.limitCount = count;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybeSingle";
    return this;
  }

  private resolve(): Result {
    let rows = this.rows.filter((row) => this.filters.every((f) => f(row)));
    if (this.orders.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          const c = compare(a[column], b[column]);
          if (c !== 0) return ascending ? c : -c;
        }
        return 0;
      });
    }
    if (this.limitCount !== null) rows = rows.slice(0, this.limitCount);

    if (this.headOnly) return { data: null, error: null, count: rows.length };
    if (this.mode === "single") {
      return rows.length === 1
        ? { data: rows[0], error: null, count: null }
        : { data: null, error: { message: "not found" }, count: null };
    }
    if (this.mode === "maybeSingle") {
      return { data: rows[0] ?? null, error: null, count: null };
    }
    return { data: rows, error: null, count: rows.length };
  }

  then<T1 = Result, T2 = never>(
    onfulfilled?: ((value: Result) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.resolve()).then(onfulfilled, onrejected);
  }
}

export function createDemoClient() {
  return {
    from(table: string) {
      return new DemoQueryBuilder(demoTables[table] ?? []);
    },
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async signInWithPassword() {
        return { data: { user: { id: "demo-user" } }, error: null };
      },
      async signUp() {
        return { data: { user: { id: "demo-user" } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}
