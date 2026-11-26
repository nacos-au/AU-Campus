-- =============================================================================
-- Digest: delete the four demo accounts created by supabase/seed.sql
--   admin@demo.test, editor@demo.test, writer@demo.test, reader@demo.test
--
-- Fixes both causes of "Database error loading user / deleting user":
--   1. seed.sql left NULL in auth token columns, which the Auth service cannot read.
--   2. Rows in other tables (articles, review comments, audit, share links, ...)
--      still reference those users and block deletion.
--
-- Scope: ONLY those four accounts, matched on BOTH id and email. No wildcards.
-- Real users, sections, editions and ads are never touched.
-- Safe to re-run. Runs as one transaction: any error rolls everything back.
--
-- Run the whole file in Supabase -> SQL Editor. The last result should show
-- zero rows remaining.
-- =============================================================================

-- ── Preview (read-only): what the cleanup will remove ───────────────────────
select
  u.email,
  p.role,
  (select count(*) from public.articles a where a.author_id = u.id) as articles_authored
from auth.users u
left join public.profiles p on p.id = u.id
where (u.id, lower(u.email)) in (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@demo.test'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'editor@demo.test'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'writer@demo.test'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'reader@demo.test')
);

-- ── Cleanup ─────────────────────────────────────────────────────────────────
do $$
declare
  mock_ids uuid[];
  col_name text;
  r record;
begin
  select array_agg(u.id) into mock_ids
  from auth.users u
  where (u.id, lower(u.email)) in (values
    ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@demo.test'),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'editor@demo.test'),
    ('00000000-0000-0000-0000-000000000003'::uuid, 'writer@demo.test'),
    ('00000000-0000-0000-0000-000000000004'::uuid, 'reader@demo.test')
  );

  if mock_ids is null then
    raise notice 'Nothing to do: none of the four seeded demo accounts exist.';
    return;
  end if;

  -- 1. Repair NULL token columns so the dashboard / Auth can load these users.
  --    Only touches columns that exist in this Auth version.
  foreach col_name in array array[
    'confirmation_token', 'recovery_token', 'email_change',
    'email_change_token_new', 'email_change_token_current',
    'phone_change', 'phone_change_token', 'reauthentication_token'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = col_name
    ) then
      execute format(
        'update auth.users set %I = coalesce(%I, '''') where id = any($1)',
        col_name, col_name
      ) using mock_ids;
    end if;
  end loop;

  -- 2. Allow clearing verified_by on profiles from the SQL editor.
  execute 'alter table public.profiles disable trigger profiles_protect_columns';

  -- 3. Weekly issue slots reference articles with ON DELETE RESTRICT.
  delete from public.weekly_issue_slots
  where article_id in (
    select id from public.articles where author_id = any(mock_ids)
  );

  -- 4. Every non-cascading foreign key that points at these users:
  --    nullable columns are set to NULL, NOT NULL columns lose those rows.
  for r in
    select
      c.conrelid::regclass as tbl,
      a.attname as col,
      a.attnotnull as not_null
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass)
      and c.confdeltype in ('a', 'r')
      and cl.relnamespace <> 'auth'::regnamespace
    order by a.attnotnull, c.conrelid::regclass::text
  loop
    if r.not_null then
      execute format('delete from %s where %I = any($1)', r.tbl, r.col) using mock_ids;
    else
      execute format('update %s set %I = null where %I = any($1)', r.tbl, r.col, r.col)
        using mock_ids;
    end if;
  end loop;

  -- 5. Delete the accounts (cascades profiles, identities, sessions, roles).
  delete from auth.users where id = any(mock_ids);

  execute 'alter table public.profiles enable trigger profiles_protect_columns';

  raise notice 'Deleted % demo account(s).', array_length(mock_ids, 1);
end
$$;

-- ── Verify: should return 0 ─────────────────────────────────────────────────
select count(*) as demo_accounts_remaining
from auth.users u
where (u.id, lower(u.email)) in (values
  ('00000000-0000-0000-0000-000000000001'::uuid, 'admin@demo.test'),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'editor@demo.test'),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'writer@demo.test'),
  ('00000000-0000-0000-0000-000000000004'::uuid, 'reader@demo.test')
);
