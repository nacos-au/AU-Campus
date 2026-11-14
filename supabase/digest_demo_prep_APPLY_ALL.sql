-- =============================================================================
-- AU Digest demo prep — apply once on the live Supabase project
-- (breaking news, article archive, weekly issues, section order)
-- Safe to re-run.
-- =============================================================================

alter table public.articles
  add column if not exists breaking boolean not null default false;

create index if not exists articles_breaking_idx
  on public.articles (breaking)
  where breaking = true and status = 'published';

drop trigger if exists articles_enforce_gate on public.articles;

alter table public.articles drop constraint if exists articles_status_check;

alter table public.articles
  add constraint articles_status_check
  check (status in (
    'draft',
    'awaiting_editor',
    'awaiting_writer',
    'published',
    'archived'
  ));

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.proname = 'enforce_article_gate'
  ) then
    execute $t$
      create trigger articles_enforce_gate
        before insert or update on public.articles
        for each row execute function private.enforce_article_gate()
    $t$;
  end if;
exception when duplicate_object then
  null;
end $$;

create table if not exists public.weekly_issues (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists weekly_issues_status_week_idx
  on public.weekly_issues (status, week_start desc);

create table if not exists public.weekly_issue_slots (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.weekly_issues (id) on delete cascade,
  slot text not null check (slot in ('lead', 'second', 'rail', 'inside')),
  position int not null default 0,
  article_id uuid not null references public.articles (id) on delete restrict,
  section_id int references public.sections (id) on delete set null,
  unique (issue_id, slot, position)
);

create index if not exists weekly_issue_slots_issue_idx
  on public.weekly_issue_slots (issue_id);

alter table public.weekly_issues enable row level security;
alter table public.weekly_issue_slots enable row level security;

drop policy if exists "weekly_issues: public read live" on public.weekly_issues;
create policy "weekly_issues: public read live" on public.weekly_issues
  for select using (
    status = 'published'
    or (status = 'scheduled' and scheduled_at is not null and scheduled_at <= now())
    or private.is_digest_editor()
  );

drop policy if exists "weekly_issues: editors write" on public.weekly_issues;
create policy "weekly_issues: editors write" on public.weekly_issues
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

drop policy if exists "weekly_issue_slots: public read" on public.weekly_issue_slots;
create policy "weekly_issue_slots: public read" on public.weekly_issue_slots
  for select using (
    exists (
      select 1 from public.weekly_issues w
      where w.id = issue_id
        and (
          w.status = 'published'
          or (w.status = 'scheduled' and w.scheduled_at is not null and w.scheduled_at <= now())
          or private.is_digest_editor()
        )
    )
  );

drop policy if exists "weekly_issue_slots: editors write" on public.weekly_issue_slots;
create policy "weekly_issue_slots: editors write" on public.weekly_issue_slots
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

-- Prefer hard-delete via digest_composer_fix_APPLY_ALL.sql.
-- Soft demote kept as a no-op fallback if those rows still exist:
update public.sections
set position = case slug
  when 'news' then 1
  when 'campus' then 2
  when 'sports' then 3
  else position + 100
end
where slug in ('news', 'campus', 'sports', 'opinion', 'culture', 'science');
