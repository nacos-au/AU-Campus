-- =============================================================================
-- Digest newsroom scale: drafts privacy, withdraw+lock, front page slots,
-- byline modes, saves, review comment resolve.
-- Safe to re-run.
-- =============================================================================

-- ─── Status: allow withdrawn (+ keep scheduled/archived if present) ─────────

alter table public.articles drop constraint if exists articles_status_check;
alter table public.articles
  add constraint articles_status_check
  check (status in (
    'draft', 'awaiting_editor', 'awaiting_writer',
    'published', 'scheduled', 'archived', 'withdrawn'
  ));

-- ─── Bylines ────────────────────────────────────────────────────────────────

alter table public.articles
  add column if not exists byline_mode text not null default 'personal';
alter table public.articles
  add column if not exists series_key text;

do $$
begin
  alter table public.articles
    add constraint articles_byline_mode_check
    check (byline_mode in ('personal', 'alias', 'series'));
exception when duplicate_object then null;
end $$;

-- ─── Review lock + audit ────────────────────────────────────────────────────

alter table public.articles
  add column if not exists review_lock_by uuid references public.profiles(id) on delete set null;
alter table public.articles
  add column if not exists review_lock_at timestamptz;

create table if not exists public.article_audit (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  title text not null,
  slug text,
  author_id uuid,
  assigned_editor_id uuid,
  actor_id uuid not null references public.profiles(id),
  action text not null check (action in ('withdrawn', 'hard_deleted')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists article_audit_created_idx
  on public.article_audit (created_at desc);

alter table public.article_audit enable row level security;

drop policy if exists "article_audit: staff read" on public.article_audit;
create policy "article_audit: staff read" on public.article_audit
  for select using (private.is_staff());

drop policy if exists "article_audit: actors read own" on public.article_audit;
create policy "article_audit: actors read own" on public.article_audit
  for select using (actor_id = auth.uid() or author_id = auth.uid());

-- ─── Drafts: staff cannot read others' drafts ───────────────────────────────

drop policy if exists "articles: staff read all" on public.articles;
create policy "articles: staff read all" on public.articles
  for select using (
    private.is_staff()
    and (
      status is distinct from 'draft'
      or author_id = auth.uid()
    )
  );

-- ─── Front page slots ───────────────────────────────────────────────────────

create table if not exists public.front_page_slots (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('page_one', 'breaking', 'top_news', 'section_highlight')),
  article_id uuid not null references public.articles(id) on delete cascade,
  section_id int references public.sections(id) on delete cascade,
  position int not null default 1 check (position >= 1),
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint front_page_slots_section_kind check (
    (kind = 'section_highlight' and section_id is not null)
    or (kind <> 'section_highlight' and section_id is null)
  )
);

create unique index if not exists front_page_slots_global_pos
  on public.front_page_slots (kind, position)
  where kind in ('page_one', 'breaking', 'top_news');

create unique index if not exists front_page_slots_section_one
  on public.front_page_slots (kind, section_id)
  where kind = 'section_highlight';

create index if not exists front_page_slots_article_idx
  on public.front_page_slots (article_id);

alter table public.front_page_slots enable row level security;

drop policy if exists "front_page_slots: public read" on public.front_page_slots;
create policy "front_page_slots: public read" on public.front_page_slots
  for select using (true);

drop policy if exists "front_page_slots: staff manage" on public.front_page_slots;
create policy "front_page_slots: staff manage" on public.front_page_slots
  for all using (private.is_digest_editor())
  with check (private.is_digest_editor());

-- Migrate existing boolean flags once (idempotent-ish: only if slots empty)
insert into public.front_page_slots (kind, article_id, position, updated_at)
select 'breaking', a.id, row_number() over (order by a.published_at desc nulls last), now()
from public.articles a
where a.status = 'published' and coalesce(a.breaking, false)
  and not exists (select 1 from public.front_page_slots s where s.kind = 'breaking')
limit 5;

insert into public.front_page_slots (kind, article_id, position, updated_at)
select 'top_news', a.id, row_number() over (order by a.published_at desc nulls last), now()
from public.articles a
where a.status = 'published' and a.featured
  and not coalesce(a.breaking, false)
  and not exists (select 1 from public.front_page_slots s where s.kind = 'top_news')
limit 5;

insert into public.front_page_slots (kind, article_id, position, updated_at)
select 'page_one', a.id, 1, now()
from public.articles a
where a.status = 'published'
  and not exists (select 1 from public.front_page_slots s where s.kind = 'page_one')
order by a.featured desc, a.published_at desc nulls last
limit 1;

-- ─── Saves ──────────────────────────────────────────────────────────────────

create table if not exists public.article_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

alter table public.article_saves enable row level security;

drop policy if exists "saves: read own" on public.article_saves;
create policy "saves: read own" on public.article_saves
  for select using (user_id = auth.uid());

drop policy if exists "saves: save published" on public.article_saves;
create policy "saves: save published" on public.article_saves
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published'
    )
  );

drop policy if exists "saves: unsave own" on public.article_saves;
create policy "saves: unsave own" on public.article_saves
  for delete using (user_id = auth.uid());

-- ─── Review comments: resolved ──────────────────────────────────────────────

alter table public.article_review_comments
  add column if not exists resolved boolean not null default false;
alter table public.article_review_comments
  add column if not exists resolved_at timestamptz;
alter table public.article_review_comments
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

-- ─── RPCs ───────────────────────────────────────────────────────────────────

create or replace function public.heartbeat_review(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Editors only';
  end if;
  update public.articles
  set review_lock_by = actor,
      review_lock_at = now()
  where id = p_article_id
    and status = 'awaiting_editor'
    and assigned_editor_id = actor
    and (
      review_lock_by is null
      or review_lock_by = actor
      or review_lock_at < now() - interval '30 minutes'
    );
end;
$$;

create or replace function public.release_review(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  update public.articles
  set review_lock_by = null,
      review_lock_at = null
  where id = p_article_id
    and (review_lock_by = actor or private.is_super_admin(actor));
end;
$$;

create or replace function public.withdraw_article(
  p_article_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  lock_active boolean;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then raise exception 'Article not found'; end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can withdraw this article';
  end if;
  if a.status not in ('awaiting_editor', 'awaiting_writer') then
    raise exception 'Only pieces in review can be withdrawn';
  end if;

  lock_active :=
    a.review_lock_by is not null
    and a.review_lock_by is distinct from actor
    and a.review_lock_at is not null
    and a.review_lock_at >= now() - interval '30 minutes';

  if lock_active then
    raise exception 'Editor is reviewing this piece — ask them to release it, or wait until the review lock expires';
  end if;

  insert into public.article_audit (
    article_id, title, slug, author_id, assigned_editor_id, actor_id, action, reason
  ) values (
    a.id, a.title, a.slug, a.author_id, a.assigned_editor_id, actor, 'withdrawn',
    nullif(trim(coalesce(p_reason, '')), '')
  );

  if a.assigned_editor_id is not null and a.assigned_editor_id is distinct from actor then
    perform private.notify(
      a.assigned_editor_id,
      'article_withdrawn',
      a.id,
      'Withdrawn by author: ' || a.title
    );
  end if;

  delete from public.article_revisions where article_id = a.id;
  delete from public.article_review_comments where article_id = a.id;

  update public.articles
  set status = 'withdrawn',
      featured = false,
      breaking = false,
      body = '{"type":"doc","content":[]}'::jsonb,
      dek = null,
      cover_url = null,
      editor_note = null,
      assigned_editor_id = null,
      review_lock_by = null,
      review_lock_at = null,
      updated_at = now()
  where id = a.id;

  delete from public.front_page_slots where article_id = a.id;
end;
$$;

create or replace function public.set_front_page_slot(
  p_kind text,
  p_article_id uuid,
  p_position int default 1,
  p_section_id int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  max_pos int;
begin
  if not private.is_digest_editor(actor) then
    raise exception 'Editors only';
  end if;
  if p_kind not in ('page_one', 'breaking', 'top_news', 'section_highlight') then
    raise exception 'Invalid slot kind';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found or a.status <> 'published' then
    raise exception 'Only published articles can be placed on the front page';
  end if;

  max_pos := case p_kind
    when 'page_one' then 1
    when 'breaking' then 5
    when 'top_news' then 5
    else 1
  end;
  if p_position < 1 or p_position > max_pos then
    raise exception 'Position out of range for %', p_kind;
  end if;

  if p_kind = 'section_highlight' then
    if p_section_id is null then
      p_section_id := a.section_id;
    end if;
    delete from public.front_page_slots
    where kind = 'section_highlight' and section_id = p_section_id;
    insert into public.front_page_slots (kind, article_id, section_id, position, set_by, updated_at)
    values ('section_highlight', p_article_id, p_section_id, 1, actor, now());
  else
    delete from public.front_page_slots
    where kind = p_kind and position = p_position;
    delete from public.front_page_slots
    where kind = p_kind and article_id = p_article_id;
    insert into public.front_page_slots (kind, article_id, section_id, position, set_by, updated_at)
    values (p_kind, p_article_id, null, p_position, actor, now());
  end if;

  -- Mirror legacy flags for transition
  if p_kind = 'breaking' then
    update public.articles set breaking = true where id = p_article_id;
  elsif p_kind = 'top_news' then
    update public.articles set featured = true where id = p_article_id;
  end if;
end;
$$;

create or replace function public.clear_front_page_slot(
  p_kind text,
  p_position int default null,
  p_section_id int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  cleared uuid;
begin
  if not private.is_digest_editor(actor) then
    raise exception 'Editors only';
  end if;

  if p_kind = 'section_highlight' then
    select article_id into cleared from public.front_page_slots
    where kind = 'section_highlight' and section_id = p_section_id;
    delete from public.front_page_slots
    where kind = 'section_highlight' and section_id = p_section_id;
  else
    select article_id into cleared from public.front_page_slots
    where kind = p_kind and (p_position is null or position = p_position)
    limit 1;
    delete from public.front_page_slots
    where kind = p_kind and (p_position is null or position = p_position);
  end if;
end;
$$;

create or replace function public.resolve_review_comment(
  p_comment_id uuid,
  p_resolved boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_review_comments;
  a public.articles;
begin
  select * into c from public.article_review_comments where id = p_comment_id;
  if not found then raise exception 'Comment not found'; end if;
  select * into a from public.articles where id = c.article_id;
  if a.author_id is distinct from actor
     and a.assigned_editor_id is distinct from actor
     and not private.is_digest_editor(actor) then
    raise exception 'Not allowed';
  end if;
  update public.article_review_comments
  set resolved = p_resolved,
      resolved_at = case when p_resolved then now() else null end,
      resolved_by = case when p_resolved then actor else null end
  where id = p_comment_id;
end;
$$;

revoke all on function public.heartbeat_review(uuid) from public;
revoke all on function public.release_review(uuid) from public;
revoke all on function public.withdraw_article(uuid, text) from public;
revoke all on function public.set_front_page_slot(text, uuid, int, int) from public;
revoke all on function public.clear_front_page_slot(text, int, int) from public;
revoke all on function public.resolve_review_comment(uuid, boolean) from public;

grant execute on function public.heartbeat_review(uuid) to authenticated;
grant execute on function public.release_review(uuid) to authenticated;
grant execute on function public.withdraw_article(uuid, text) to authenticated;
grant execute on function public.set_front_page_slot(text, uuid, int, int) to authenticated;
grant execute on function public.clear_front_page_slot(text, int, int) to authenticated;
grant execute on function public.resolve_review_comment(uuid, boolean) to authenticated;
