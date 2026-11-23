-- Digest article series (see digest_article_series_APPLY_ALL.sql)

create table if not exists public.article_series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists article_series_title_idx
  on public.article_series (lower(title));

alter table public.articles
  add column if not exists series_id uuid references public.article_series(id) on delete set null;

create index if not exists articles_series_id_idx
  on public.articles (series_id)
  where series_id is not null;

alter table public.articles drop constraint if exists articles_byline_mode_check;

insert into public.article_series (slug, title, created_by)
select distinct on (slug)
  slug,
  title,
  author_id
from (
  select
    coalesce(
      nullif(trim(a.series_key), ''),
      regexp_replace(
        lower(trim(coalesce(a.byline, 'untitled-series'))),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    ) as slug,
    coalesce(nullif(trim(a.byline), ''), initcap(replace(coalesce(a.series_key, 'series'), '-', ' '))) as title,
    a.author_id
  from public.articles a
  where a.byline_mode = 'series'
) src
where slug is not null and slug <> ''
on conflict (slug) do nothing;

update public.articles a
set
  series_id = s.id,
  byline_mode = 'personal',
  byline = null
from public.article_series s
where a.byline_mode = 'series'
  and a.series_id is null
  and s.slug = coalesce(
    nullif(trim(a.series_key), ''),
    regexp_replace(
      lower(trim(coalesce(a.byline, 'untitled-series'))),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );

update public.articles
set byline_mode = 'personal'
where byline_mode = 'series';

alter table public.articles
  add constraint articles_byline_mode_check
  check (byline_mode in ('personal', 'alias'));

alter table public.article_series enable row level security;

drop policy if exists "article_series: public read" on public.article_series;
create policy "article_series: public read" on public.article_series
  for select using (true);

drop policy if exists "article_series: writers insert" on public.article_series;
create policy "article_series: writers insert" on public.article_series
  for insert with check (
    auth.uid() is not null
    and (
      private.my_role() in ('writer', 'editor', 'admin')
      or private.is_super_admin()
    )
  );

drop policy if exists "article_series: owners update" on public.article_series;
create policy "article_series: owners update" on public.article_series
  for update using (
    created_by = auth.uid()
    or private.is_digest_editor()
    or private.is_super_admin()
  )
  with check (
    created_by = auth.uid()
    or private.is_digest_editor()
    or private.is_super_admin()
  );

drop policy if exists "article_series: staff delete" on public.article_series;
create policy "article_series: staff delete" on public.article_series
  for delete using (
    private.is_digest_editor()
    or private.is_super_admin()
  );

create or replace function public.ensure_article_series(
  p_title text,
  p_slug text default null
)
returns public.article_series
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_slug text;
  s public.article_series;
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not (
    private.my_role() in ('writer', 'editor', 'admin')
    or private.is_super_admin(actor)
  ) then
    raise exception 'Only newsroom staff can create series';
  end if;
  if v_title is null then
    raise exception 'Series title is required';
  end if;

  v_slug := nullif(trim(coalesce(p_slug, '')), '');
  if v_slug is null then
    v_slug := regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
  else
    v_slug := regexp_replace(lower(v_slug), '[^a-z0-9]+', '-', 'g');
    v_slug := trim(both '-' from v_slug);
  end if;

  if v_slug is null or v_slug = '' then
    raise exception 'Could not build a series slug';
  end if;

  select * into s from public.article_series where slug = v_slug;
  if found then
    return s;
  end if;

  insert into public.article_series (slug, title, created_by)
  values (v_slug, v_title, actor)
  on conflict (slug) do update
    set title = excluded.title,
        updated_at = now()
  returning * into s;

  return s;
end;
$$;

revoke all on function public.ensure_article_series(text, text) from public;
grant execute on function public.ensure_article_series(text, text) to authenticated;

create or replace function private.snapshot_article(a public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'title', a.title,
    'dek', a.dek,
    'body', a.body,
    'cover_url', a.cover_url,
    'byline', a.byline,
    'byline_mode', a.byline_mode,
    'series_id', a.series_id,
    'section_id', a.section_id,
    'language', a.language,
    'status', a.status,
    'published_at', a.published_at
  );
$$;
