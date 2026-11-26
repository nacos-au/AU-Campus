-- Article discussions MVP (mirrors digest_article_comments_APPLY_ALL.sql)
--
-- Everyone signed in may comment. Rules govern conduct, not opinion.
-- Moderation = existing editor/admin roles (private.is_digest_editor).
-- Nothing is ever hard-deleted: removals are statuses with an audit trail.
-- All writes go through security-definer RPCs; clients never touch the tables.

-- ─── Articles: counters + per-story kill switch ─────────────────────────────

alter table public.articles
  add column if not exists comment_count integer not null default 0,
  add column if not exists comments_locked boolean not null default false;

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  parent_id uuid references public.article_comments (id) on delete cascade,
  reply_to_id uuid references public.article_comments (id) on delete set null,
  -- set null so deleting a user never blocks again
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 2 and 1200),
  status text not null default 'visible'
    check (status in ('visible', 'held', 'collapsed', 'removed')),
  removed_reason text,
  like_count integer not null default 0,
  report_count integer not null default 0,
  -- an editor has kept this comment: reports no longer auto-collapse it
  reviewed boolean not null default false,
  deleted_at timestamptz,
  edited_at timestamptz,
  moderated_by uuid references public.profiles (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  check (parent_id is null or char_length(body) <= 600)
);

create index if not exists article_comments_article_idx
  on public.article_comments (article_id, created_at desc)
  where parent_id is null;
create index if not exists article_comments_parent_idx
  on public.article_comments (parent_id, created_at);
create index if not exists article_comments_author_idx
  on public.article_comments (author_id, created_at desc);
create index if not exists article_comments_status_idx
  on public.article_comments (status)
  where status <> 'visible';

create table if not exists public.comment_likes (
  comment_id uuid not null references public.article_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.article_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null
    check (reason in ('harassment', 'threat', 'private_info', 'impersonation', 'spam', 'other')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution text check (resolution is null or resolution in ('dismissed', 'actioned')),
  unique (comment_id, reporter_id)
);

create index if not exists comment_reports_open_idx
  on public.comment_reports (comment_id)
  where resolved_at is null;

create table if not exists public.comment_mod_log (
  id bigint generated always as identity primary key,
  comment_id uuid references public.article_comments (id) on delete set null,
  article_id uuid references public.articles (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  reason text,
  body_snapshot text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists comment_mod_log_created_idx
  on public.comment_mod_log (created_at desc);

create table if not exists public.comment_suspensions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- null = indefinite (until lifted)
  until_at timestamptz,
  reason text not null,
  created_by uuid references public.profiles (id) on delete set null,
  source_comment_id uuid references public.article_comments (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  lifted_by uuid references public.profiles (id) on delete set null
);

create index if not exists comment_suspensions_user_idx
  on public.comment_suspensions (user_id)
  where lifted_at is null;

-- Filter terms: created and seeded exactly once, so a term an editor removes
-- stays removed even if this file is applied again.
do $$
begin
  if to_regclass('public.comment_filters') is null then
    create table public.comment_filters (
      id bigint generated always as identity primary key,
      term text not null,
      category text not null default 'other'
        check (category in ('threat', 'spam', 'sexual', 'slur', 'other')),
      created_by uuid references public.profiles (id) on delete set null,
      created_at timestamptz not null default now()
    );

    create unique index comment_filters_term_idx
      on public.comment_filters (lower(term));

    insert into public.comment_filters (term, category) values
      -- threats and self-harm
      ('kill yourself', 'threat'),
      ('kys', 'threat'),
      ('i will kill you', 'threat'),
      ('i''ll kill you', 'threat'),
      ('i will find you', 'threat'),
      -- spam and solicitation
      ('whatsapp me', 'spam'),
      ('dm for business', 'spam'),
      ('crypto investment', 'spam'),
      ('send btc', 'spam'),
      ('click this link', 'spam'),
      -- sexual solicitation
      ('send nudes', 'sexual'),
      -- common slurs (whole words only; matches are held for editor review)
      ('nigger', 'slur'),
      ('nigga', 'slur'),
      ('faggot', 'slur'),
      ('fag', 'slur'),
      ('retard', 'slur'),
      ('tranny', 'slur'),
      ('kike', 'slur'),
      ('spic', 'slur'),
      ('chink', 'slur'),
      ('wetback', 'slur'),
      ('gook', 'slur'),
      ('dyke', 'slur'),
      ('paki', 'slur'),
      ('coon', 'slur'),
      ('towelhead', 'slur');
  end if;
end
$$;

-- ─── Helpers ────────────────────────────────────────────────────────────────

-- lowercase, strip common accents, undo 0/1/3/4/5/@/$ substitutions, letters only
create or replace function private.comment_normalize(t text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      translate(
        lower(coalesce(t, '')),
        'àáâãäåèéêëìíîïòóôõöùúûüñç01345@$',
        'aaaaaaeeeeiiiiooooouuuuncoieasas'
      ),
      '[^a-z]+',
      ' ',
      'g'
    )
  );
$$;

create or replace function private.comment_matches_filter(p_body text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.comment_filters f
    where private.comment_normalize(f.term) <> ''
      and position(
        ' ' || private.comment_normalize(f.term) || ' '
        in ' ' || private.comment_normalize(p_body) || ' '
      ) > 0
  );
$$;

-- one comment as the public sees it (removed / author-deleted text is blanked)
create or replace function private.comment_to_json(
  c public.article_comments,
  viewer uuid,
  staff boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'article_id', c.article_id,
    'parent_id', c.parent_id,
    'reply_to_id', c.reply_to_id,
    'reply_to_name', (
      select rp.display_name
      from public.article_comments rc
      join public.profiles rp on rp.id = rc.author_id
      where rc.id = c.reply_to_id
    ),
    'author_id', c.author_id,
    'author_name', coalesce(p.display_name, 'Former member'),
    'author_username', p.username,
    'author_avatar', p.avatar_url,
    'badge', case
      when p.role::text in ('writer', 'editor', 'admin') then
        coalesce(
          nullif(to_jsonb(p) ->> 'desk_credit', ''),
          case when p.role::text = 'editor' then 'editor' else 'writer' end
        )
      else null
    end,
    'body', case
      when c.deleted_at is not null or c.status = 'removed' then ''
      else c.body
    end,
    'status', c.status,
    'deleted', c.deleted_at is not null,
    'removed_reason', case when c.status = 'removed' then c.removed_reason else null end,
    'like_count', c.like_count,
    'reply_count', (
      select count(*)
      from public.article_comments r
      where r.parent_id = c.id
        and r.deleted_at is null
        and (r.status <> 'held' or r.author_id = viewer or staff)
    ),
    'liked_by_me', exists (
      select 1 from public.comment_likes l
      where l.comment_id = c.id and l.user_id = viewer
    ),
    'is_mine', (c.author_id is not null and c.author_id = viewer),
    'can_edit', (
      c.author_id is not null
      and c.author_id = viewer
      and c.deleted_at is null
      and c.status <> 'removed'
      and c.created_at > now() - interval '10 minutes'
    ),
    'edited_at', c.edited_at,
    'created_at', c.created_at
  )
  from (select 1) _
  left join public.profiles p on p.id = c.author_id;
$$;

-- ─── Triggers ───────────────────────────────────────────────────────────────

create or replace function private.sync_comment_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  aid uuid := coalesce(new.article_id, old.article_id);
begin
  update public.articles a
  set comment_count = (
    select count(*)
    from public.article_comments c
    where c.article_id = aid
      and c.status in ('visible', 'collapsed')
      and c.deleted_at is null
  )
  where a.id = aid;
  return null;
end;
$$;

drop trigger if exists article_comments_count on public.article_comments;
create trigger article_comments_count
  after insert or delete or update of status, deleted_at on public.article_comments
  for each row execute function private.sync_comment_counts();

create or replace function private.sync_comment_likes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.article_comments
    set like_count = like_count + 1
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.article_comments
    set like_count = greatest(like_count - 1, 0)
    where id = old.comment_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_count on public.comment_likes;
create trigger comment_likes_count
  after insert or delete on public.comment_likes
  for each row execute function private.sync_comment_likes();

-- report_count = open reports from distinct people; 3 collapses (never removes)
create or replace function private.sync_comment_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid := coalesce(new.comment_id, old.comment_id);
  open_n integer;
  c public.article_comments;
begin
  select count(distinct reporter_id) into open_n
  from public.comment_reports
  where comment_id = cid and resolved_at is null;

  update public.article_comments
  set report_count = open_n
  where id = cid
  returning * into c;

  if tg_op = 'INSERT'
     and open_n >= 3
     and c.status = 'visible'
     and not c.reviewed then
    update public.article_comments
    set status = 'collapsed', moderated_at = now()
    where id = cid;

    insert into public.comment_mod_log
      (comment_id, article_id, actor_id, target_user_id, action, reason, body_snapshot)
    values
      (cid, c.article_id, null, c.author_id, 'auto_collapse',
       open_n || ' reports from different people', c.body);
  end if;

  return null;
end;
$$;

drop trigger if exists comment_reports_sync on public.comment_reports;
create trigger comment_reports_sync
  after insert or update of resolved_at or delete on public.comment_reports
  for each row execute function private.sync_comment_reports();

-- ─── RLS: reads for staff / own rows only; writes only through RPCs ─────────

alter table public.article_comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.comment_reports enable row level security;
alter table public.comment_mod_log enable row level security;
alter table public.comment_filters enable row level security;
alter table public.comment_suspensions enable row level security;

drop policy if exists "comments: staff read" on public.article_comments;
create policy "comments: staff read" on public.article_comments
  for select using (private.is_digest_editor((select auth.uid())));

drop policy if exists "comments: read own" on public.article_comments;
create policy "comments: read own" on public.article_comments
  for select using (author_id = (select auth.uid()));

drop policy if exists "comment_reports: staff read" on public.comment_reports;
create policy "comment_reports: staff read" on public.comment_reports
  for select using (private.is_digest_editor((select auth.uid())));

drop policy if exists "comment_mod_log: staff read" on public.comment_mod_log;
create policy "comment_mod_log: staff read" on public.comment_mod_log
  for select using (private.is_digest_editor((select auth.uid())));

drop policy if exists "comment_filters: staff read" on public.comment_filters;
create policy "comment_filters: staff read" on public.comment_filters
  for select using (private.is_digest_editor((select auth.uid())));

drop policy if exists "comment_suspensions: staff read" on public.comment_suspensions;
create policy "comment_suspensions: staff read" on public.comment_suspensions
  for select using (private.is_digest_editor((select auth.uid())));

drop policy if exists "comment_suspensions: read own" on public.comment_suspensions;
create policy "comment_suspensions: read own" on public.comment_suspensions
  for select using (user_id = (select auth.uid()));

revoke insert, update, delete on
  public.article_comments,
  public.comment_likes,
  public.comment_reports,
  public.comment_mod_log,
  public.comment_filters,
  public.comment_suspensions
from anon, authenticated;

-- ─── Public reads (RPC so removed text is never sent to the browser) ────────

create or replace function public.get_comment_meta(p_article_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  a public.articles;
  v_susp_id uuid;
  v_susp_until timestamptz;
begin
  select * into a from public.articles where id = p_article_id and status = 'published';
  if not found then
    return jsonb_build_object('count', 0, 'locked', true, 'suspended', false);
  end if;

  if viewer is not null then
    select s.id, s.until_at into v_susp_id, v_susp_until
    from public.comment_suspensions s
    where s.user_id = viewer
      and s.lifted_at is null
      and (s.until_at is null or s.until_at > now())
    order by s.created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'count', a.comment_count,
    'locked', a.comments_locked,
    'suspended', v_susp_id is not null,
    'suspended_until', v_susp_until,
    'signed_in', viewer is not null,
    'staff', coalesce(private.is_digest_editor(viewer), false)
  );
end;
$$;

create or replace function public.list_article_comments(
  p_article_id uuid,
  p_sort text default 'newest',
  p_limit integer default 5,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  staff boolean := coalesce(private.is_digest_editor(viewer), false);
  lim integer := least(greatest(coalesce(p_limit, 5), 1), 20);
  skip integer := greatest(coalesce(p_offset, 0), 0);
  total integer;
  items jsonb;
  rec public.article_comments;
begin
  if not exists (
    select 1 from public.articles a where a.id = p_article_id and a.status = 'published'
  ) then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  select count(*) into total
  from public.article_comments c
  where c.article_id = p_article_id
    and c.parent_id is null
    and (c.status <> 'held' or c.author_id = viewer or staff)
    and (
      c.deleted_at is null
      or exists (
        select 1 from public.article_comments r
        where r.parent_id = c.id and r.deleted_at is null and r.status <> 'held'
      )
    );

  items := '[]'::jsonb;
  for rec in
    select c0.*
    from public.article_comments c0
    where c0.article_id = p_article_id
      and c0.parent_id is null
      and (c0.status <> 'held' or c0.author_id = viewer or staff)
      and (
        c0.deleted_at is null
        or exists (
          select 1 from public.article_comments r
          where r.parent_id = c0.id and r.deleted_at is null and r.status <> 'held'
        )
      )
    order by
      (case when p_sort = 'liked' then c0.like_count end) desc nulls last,
      (case when p_sort = 'oldest' then c0.created_at end) asc nulls last,
      c0.created_at desc,
      c0.id
    limit lim offset skip
  loop
    items := items || jsonb_build_array(private.comment_to_json(rec, viewer, staff));
  end loop;

  return jsonb_build_object('total', total, 'items', items);
end;
$$;

create or replace function public.list_comment_replies(
  p_parent_id uuid,
  p_limit integer default 5,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  staff boolean := coalesce(private.is_digest_editor(viewer), false);
  lim integer := least(greatest(coalesce(p_limit, 5), 1), 20);
  skip integer := greatest(coalesce(p_offset, 0), 0);
  total integer;
  items jsonb;
  rec public.article_comments;
begin
  if not exists (
    select 1
    from public.article_comments p
    join public.articles a on a.id = p.article_id
    where p.id = p_parent_id and a.status = 'published'
  ) then
    return jsonb_build_object('total', 0, 'items', '[]'::jsonb);
  end if;

  select count(*) into total
  from public.article_comments r
  where r.parent_id = p_parent_id
    and r.deleted_at is null
    and (r.status <> 'held' or r.author_id = viewer or staff);

  items := '[]'::jsonb;
  for rec in
    select r0.*
    from public.article_comments r0
    where r0.parent_id = p_parent_id
      and r0.deleted_at is null
      and (r0.status <> 'held' or r0.author_id = viewer or staff)
    order by r0.created_at, r0.id
    limit lim offset skip
  loop
    items := items || jsonb_build_array(private.comment_to_json(rec, viewer, staff));
  end loop;

  return jsonb_build_object('total', total, 'items', items);
end;
$$;

-- one comment by id (for #c-<id> permalinks)
create or replace function public.get_article_comment(p_comment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  viewer uuid := auth.uid();
  staff boolean := coalesce(private.is_digest_editor(viewer), false);
  c public.article_comments;
begin
  select c0.* into c
  from public.article_comments c0
  join public.articles a on a.id = c0.article_id
  where c0.id = p_comment_id
    and a.status = 'published'
    and c0.deleted_at is null
    and (c0.status <> 'held' or c0.author_id = viewer or staff);

  if not found then
    return null;
  end if;

  return private.comment_to_json(c, viewer, staff);
end;
$$;

-- ─── Writes (all security definer) ──────────────────────────────────────────

create or replace function public.post_article_comment(
  p_article_id uuid,
  p_body text,
  p_parent_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  art public.articles;
  susp public.comment_suspensions;
  target public.article_comments;
  v_body text := btrim(regexp_replace(coalesce(p_body, ''), '[\x01-\x08\x0b\x0c\x0e-\x1f]', '', 'g'));
  v_parent uuid;
  v_reply_to uuid;
  v_status text := 'visible';
  max_len integer;
  c public.article_comments;
begin
  if actor is null then
    raise exception 'Sign in to comment.';
  end if;

  select * into art from public.articles where id = p_article_id;
  if not found or art.status <> 'published' then
    raise exception 'Comments are not open on this story.';
  end if;
  if art.comments_locked then
    raise exception 'Comments are closed on this story.';
  end if;

  select * into susp
  from public.comment_suspensions
  where user_id = actor
    and lifted_at is null
    and (until_at is null or until_at > now())
  order by created_at desc
  limit 1;
  if found then
    if susp.until_at is null then
      raise exception 'Commenting is paused on your account.';
    end if;
    raise exception 'Commenting is paused until % (UTC).',
      to_char(susp.until_at at time zone 'UTC', 'Mon DD, YYYY HH24:MI');
  end if;

  if p_parent_id is not null then
    select * into target
    from public.article_comments
    where id = p_parent_id and article_id = p_article_id;
    if not found
       or target.deleted_at is not null
       or target.status in ('held', 'removed') then
      raise exception 'You can''t reply to that comment.';
    end if;
    if target.parent_id is null then
      v_parent := target.id;
    else
      v_parent := target.parent_id;
      v_reply_to := target.id;
    end if;
  end if;

  max_len := case when v_parent is null then 1200 else 600 end;
  if char_length(v_body) < 2 then
    raise exception 'Write at least 2 characters.';
  end if;
  if char_length(v_body) > max_len then
    raise exception 'Too long: the limit is % characters.', max_len;
  end if;

  if exists (
    select 1 from public.article_comments
    where author_id = actor and created_at > now() - interval '15 seconds'
  ) then
    raise exception 'Slow down: wait a few seconds before posting again.';
  end if;
  if (
    select count(*) from public.article_comments
    where author_id = actor and created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Daily comment limit reached. Try again tomorrow.';
  end if;
  if exists (
    select 1 from public.article_comments
    where author_id = actor
      and created_at > now() - interval '10 minutes'
      and lower(body) = lower(v_body)
  ) then
    raise exception 'You already posted that.';
  end if;

  if private.comment_matches_filter(v_body) then
    v_status := 'held';
  end if;

  insert into public.article_comments
    (article_id, parent_id, reply_to_id, author_id, body, status)
  values
    (p_article_id, v_parent, v_reply_to, actor, v_body, v_status)
  returning * into c;

  if v_status = 'held' then
    insert into public.comment_mod_log
      (comment_id, article_id, actor_id, target_user_id, action, reason, body_snapshot)
    values
      (c.id, c.article_id, null, actor, 'filter_hold', 'Matched the language filter', c.body);
  end if;

  return private.comment_to_json(c, actor, private.is_digest_editor(actor));
end;
$$;

create or replace function public.edit_article_comment(p_comment_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_comments;
  v_body text := btrim(regexp_replace(coalesce(p_body, ''), '[\x01-\x08\x0b\x0c\x0e-\x1f]', '', 'g'));
  max_len integer;
  new_status text;
begin
  if actor is null then
    raise exception 'Sign in to edit.';
  end if;

  select * into c from public.article_comments where id = p_comment_id;
  if not found or c.author_id is distinct from actor then
    raise exception 'You can only edit your own comments.';
  end if;
  if c.deleted_at is not null or c.status = 'removed' then
    raise exception 'This comment can no longer be edited.';
  end if;
  if c.created_at < now() - interval '10 minutes' then
    raise exception 'Comments can only be edited for 10 minutes after posting.';
  end if;
  if exists (
    select 1 from public.articles a where a.id = c.article_id and a.comments_locked
  ) then
    raise exception 'Comments are closed on this story.';
  end if;

  max_len := case when c.parent_id is null then 1200 else 600 end;
  if char_length(v_body) < 2 then
    raise exception 'Write at least 2 characters.';
  end if;
  if char_length(v_body) > max_len then
    raise exception 'Too long: the limit is % characters.', max_len;
  end if;

  new_status := c.status;
  if private.comment_matches_filter(v_body) then
    new_status := 'held';
  elsif c.status = 'held' then
    new_status := 'visible';
  end if;

  update public.article_comments
  set body = v_body, status = new_status, edited_at = now()
  where id = c.id
  returning * into c;

  if new_status = 'held' then
    insert into public.comment_mod_log
      (comment_id, article_id, actor_id, target_user_id, action, reason, body_snapshot)
    values
      (c.id, c.article_id, null, actor, 'filter_hold', 'Edit matched the language filter', c.body);
  end if;

  return private.comment_to_json(c, actor, private.is_digest_editor(actor));
end;
$$;

create or replace function public.delete_own_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_comments;
begin
  if actor is null then
    raise exception 'Sign in required.';
  end if;
  select * into c from public.article_comments where id = p_comment_id;
  if not found or c.author_id is distinct from actor then
    raise exception 'You can only delete your own comments.';
  end if;
  if c.deleted_at is not null then
    return;
  end if;

  update public.article_comments set deleted_at = now() where id = c.id;
end;
$$;

create or replace function public.toggle_comment_like(p_comment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_comments;
  now_liked boolean;
  v_likes integer;
begin
  if actor is null then
    raise exception 'Sign in to like comments.';
  end if;

  select c0.* into c
  from public.article_comments c0
  join public.articles a on a.id = c0.article_id
  where c0.id = p_comment_id
    and a.status = 'published'
    and c0.deleted_at is null
    and c0.status in ('visible', 'collapsed');
  if not found then
    raise exception 'That comment is not available.';
  end if;
  if c.author_id = actor then
    raise exception 'You can''t like your own comment.';
  end if;

  if exists (
    select 1 from public.comment_likes where comment_id = c.id and user_id = actor
  ) then
    delete from public.comment_likes where comment_id = c.id and user_id = actor;
    now_liked := false;
  else
    insert into public.comment_likes (comment_id, user_id) values (c.id, actor);
    now_liked := true;
  end if;

  select ac.like_count into v_likes from public.article_comments ac where ac.id = c.id;
  return jsonb_build_object('liked', now_liked, 'like_count', v_likes);
end;
$$;

create or replace function public.report_comment(
  p_comment_id uuid,
  p_reason text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_comments;
begin
  if actor is null then
    raise exception 'Sign in to report a comment.';
  end if;

  select c0.* into c
  from public.article_comments c0
  join public.articles a on a.id = c0.article_id
  where c0.id = p_comment_id
    and a.status = 'published'
    and c0.deleted_at is null
    and c0.status in ('visible', 'collapsed');
  if not found then
    raise exception 'That comment is not available.';
  end if;
  if c.author_id = actor then
    raise exception 'You can''t report your own comment.';
  end if;

  begin
    insert into public.comment_reports (comment_id, reporter_id, reason, note)
    values (
      c.id,
      actor,
      p_reason,
      nullif(left(btrim(coalesce(p_note, '')), 300), '')
    );
  exception
    when unique_violation then
      raise exception 'You have already reported this comment.';
    when check_violation then
      raise exception 'Choose a valid reason.';
  end;
end;
$$;

create or replace function public.moderate_comment(
  p_comment_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  c public.article_comments;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  new_status text;
  log_action text;
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can moderate comments.';
  end if;

  select * into c from public.article_comments where id = p_comment_id;
  if not found then
    raise exception 'Comment not found.';
  end if;

  case p_action
    when 'keep' then
      new_status := 'visible'; log_action := 'keep';
    when 'collapse' then
      new_status := 'collapsed'; log_action := 'collapse';
    when 'remove' then
      if v_reason is null then
        raise exception 'A reason is required to remove a comment.';
      end if;
      new_status := 'removed'; log_action := 'remove';
    when 'restore' then
      new_status := 'visible'; log_action := 'restore';
    when 'approve' then
      new_status := 'visible'; log_action := 'approve';
    else
      raise exception 'Unknown action.';
  end case;

  update public.article_comments
  set status = new_status,
      removed_reason = case when new_status = 'removed' then v_reason else null end,
      reviewed = case when p_action in ('keep', 'restore', 'approve') then true else reviewed end,
      moderated_by = actor,
      moderated_at = now()
  where id = c.id
  returning * into c;

  update public.comment_reports
  set resolved_at = now(),
      resolved_by = actor,
      resolution = case when p_action = 'keep' then 'dismissed' else 'actioned' end
  where comment_id = c.id and resolved_at is null;

  insert into public.comment_mod_log
    (comment_id, article_id, actor_id, target_user_id, action, reason, body_snapshot)
  values
    (c.id, c.article_id, actor, c.author_id, log_action, v_reason, c.body);

  return private.comment_to_json(c, actor, true);
end;
$$;

create or replace function public.suspend_commenter(
  p_user_id uuid,
  p_duration text,
  p_reason text,
  p_comment_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_until timestamptz;
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can suspend commenters.';
  end if;
  if v_reason is null then
    raise exception 'A reason is required.';
  end if;
  if p_user_id = actor then
    raise exception 'You can''t suspend yourself.';
  end if;
  if private.is_digest_editor(p_user_id) and not private.is_digest_admin(actor) then
    raise exception 'Only an admin can suspend an editor or admin.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found.';
  end if;

  if p_duration = '7d' then
    v_until := now() + interval '7 days';
  elsif p_duration = 'indefinite' then
    v_until := null;
  else
    raise exception 'Choose 7 days or indefinitely.';
  end if;

  update public.comment_suspensions
  set lifted_at = now(), lifted_by = actor
  where user_id = p_user_id and lifted_at is null;

  insert into public.comment_suspensions
    (user_id, until_at, reason, created_by, source_comment_id)
  values
    (p_user_id, v_until, v_reason, actor, p_comment_id);

  insert into public.comment_mod_log
    (comment_id, actor_id, target_user_id, action, reason, detail)
  values
    (p_comment_id, actor, p_user_id, 'suspend', v_reason,
     jsonb_build_object('duration', p_duration, 'until', v_until));
end;
$$;

create or replace function public.lift_comment_suspension(p_suspension_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  s public.comment_suspensions;
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can lift suspensions.';
  end if;

  update public.comment_suspensions
  set lifted_at = now(), lifted_by = actor
  where id = p_suspension_id and lifted_at is null
  returning * into s;
  if not found then
    return;
  end if;

  insert into public.comment_mod_log (actor_id, target_user_id, action, reason)
  values (actor, s.user_id, 'lift_suspension', null);
end;
$$;

create or replace function public.set_comments_locked(p_article_id uuid, p_locked boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can lock comments.';
  end if;

  update public.articles
  set comments_locked = coalesce(p_locked, false)
  where id = p_article_id;
  if not found then
    raise exception 'Article not found.';
  end if;

  insert into public.comment_mod_log (article_id, actor_id, action)
  values (p_article_id, actor, case when p_locked then 'lock_comments' else 'unlock_comments' end);
end;
$$;

create or replace function public.add_comment_filter(p_term text, p_category text default 'other')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  v_term text := lower(btrim(coalesce(p_term, '')));
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can edit the filter list.';
  end if;
  if char_length(v_term) < 2 or char_length(v_term) > 60 then
    raise exception 'A term must be 2 to 60 characters.';
  end if;
  if private.comment_normalize(v_term) = '' then
    raise exception 'A term must contain letters.';
  end if;

  insert into public.comment_filters (term, category, created_by)
  values (v_term, case when p_category in ('threat', 'spam', 'sexual', 'slur') then p_category else 'other' end, actor)
  on conflict (lower(term)) do nothing;

  insert into public.comment_mod_log (actor_id, action, reason)
  values (actor, 'filter_add', v_term);
end;
$$;

create or replace function public.remove_comment_filter(p_filter_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  f public.comment_filters;
begin
  if actor is null or not private.is_digest_editor(actor) then
    raise exception 'Only editors can edit the filter list.';
  end if;

  delete from public.comment_filters where id = p_filter_id returning * into f;
  if found then
    insert into public.comment_mod_log (actor_id, action, reason)
    values (actor, 'filter_remove', f.term);
  end if;
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────

revoke all on function public.get_comment_meta(uuid) from public;
revoke all on function public.list_article_comments(uuid, text, integer, integer) from public;
revoke all on function public.list_comment_replies(uuid, integer, integer) from public;
revoke all on function public.get_article_comment(uuid) from public;
grant execute on function public.get_comment_meta(uuid) to anon, authenticated;
grant execute on function public.list_article_comments(uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.list_comment_replies(uuid, integer, integer) to anon, authenticated;
grant execute on function public.get_article_comment(uuid) to anon, authenticated;

revoke all on function public.post_article_comment(uuid, text, uuid) from public;
revoke all on function public.edit_article_comment(uuid, text) from public;
revoke all on function public.delete_own_comment(uuid) from public;
revoke all on function public.toggle_comment_like(uuid) from public;
revoke all on function public.report_comment(uuid, text, text) from public;
revoke all on function public.moderate_comment(uuid, text, text) from public;
revoke all on function public.suspend_commenter(uuid, text, text, uuid) from public;
revoke all on function public.lift_comment_suspension(uuid) from public;
revoke all on function public.set_comments_locked(uuid, boolean) from public;
revoke all on function public.add_comment_filter(text, text) from public;
revoke all on function public.remove_comment_filter(bigint) from public;
grant execute on function public.post_article_comment(uuid, text, uuid) to authenticated;
grant execute on function public.edit_article_comment(uuid, text) to authenticated;
grant execute on function public.delete_own_comment(uuid) to authenticated;
grant execute on function public.toggle_comment_like(uuid) to authenticated;
grant execute on function public.report_comment(uuid, text, text) to authenticated;
grant execute on function public.moderate_comment(uuid, text, text) to authenticated;
grant execute on function public.suspend_commenter(uuid, text, text, uuid) to authenticated;
grant execute on function public.lift_comment_suspension(uuid) to authenticated;
grant execute on function public.set_comments_locked(uuid, boolean) to authenticated;
grant execute on function public.add_comment_filter(text, text) to authenticated;
grant execute on function public.remove_comment_filter(bigint) to authenticated;
