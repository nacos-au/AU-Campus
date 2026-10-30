-- =============================================================================
-- Digest review workflow
--   * byline (series / pen name) separate from the account
--   * statuses: draft -> awaiting_editor <-> awaiting_writer -> published
--   * published edits go through the same process via article_revisions
--   * highlight + general review comments, in-app notifications, article likes
-- Requires 20261030120000_sole_editor_self_publish.sql (digest editor helpers).
-- =============================================================================

create schema if not exists private;

-- ─── Columns ────────────────────────────────────────────────────────────────

alter table public.articles
  add column if not exists byline text,
  add column if not exists like_count int not null default 0;

-- ─── Statuses ───────────────────────────────────────────────────────────────

drop trigger if exists articles_enforce_gate on public.articles;

alter table public.articles drop constraint if exists articles_status_check;

update public.articles set status = 'awaiting_editor' where status = 'submitted';
update public.articles set status = 'awaiting_writer' where status = 'rejected';

alter table public.articles
  add constraint articles_status_check
  check (status in ('draft', 'awaiting_editor', 'awaiting_writer', 'published'));

-- ─── Revisions of live articles ─────────────────────────────────────────────

create table if not exists public.article_revisions (
  article_id uuid primary key references public.articles (id) on delete cascade,
  payload jsonb not null,
  state text not null default 'draft'
    check (state in ('draft', 'awaiting_editor', 'awaiting_writer')),
  assigned_editor_id uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

alter table public.article_revisions enable row level security;

create policy "revisions: participants read" on public.article_revisions
  for select using (
    private.is_digest_editor()
    or assigned_editor_id = (select auth.uid())
    or exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = (select auth.uid())
    )
  );

-- ─── Review comments ────────────────────────────────────────────────────────

create table if not exists public.article_review_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  anchor jsonb,
  created_at timestamptz not null default now()
);

create index if not exists article_review_comments_article_idx
  on public.article_review_comments (article_id, created_at);

alter table public.article_review_comments enable row level security;

create policy "review comments: participants read" on public.article_review_comments
  for select using (
    private.is_digest_editor()
    or exists (
      select 1 from public.articles a
      where a.id = article_id
        and (a.author_id = (select auth.uid())
             or a.assigned_editor_id = (select auth.uid()))
    )
    or exists (
      select 1 from public.article_revisions r
      where r.article_id = article_review_comments.article_id
        and r.assigned_editor_id = (select auth.uid())
    )
  );

-- ─── Notifications ──────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  article_id uuid references public.articles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications: read own" on public.notifications
  for select using (user_id = (select auth.uid()));

create policy "notifications: update own" on public.notifications
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── Likes ──────────────────────────────────────────────────────────────────

create table if not exists public.article_likes (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade
    default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

alter table public.article_likes enable row level security;

create policy "likes: read own" on public.article_likes
  for select using (user_id = (select auth.uid()));

create policy "likes: like published" on public.article_likes
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.articles a
      where a.id = article_id and a.status = 'published'
    )
  );

create policy "likes: unlike own" on public.article_likes
  for delete using (user_id = (select auth.uid()));

create or replace function private.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set like_count = like_count + 1 where id = new.article_id;
  elsif tg_op = 'DELETE' then
    update public.articles set like_count = greatest(like_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

drop trigger if exists article_likes_count on public.article_likes;
create trigger article_likes_count
  after insert or delete on public.article_likes
  for each row execute function private.sync_like_count();

-- ─── Article policies for the new statuses ──────────────────────────────────

drop policy if exists "articles: authors edit unpublished" on public.articles;
create policy "articles: authors edit unpublished" on public.articles
  for update using (
    (select auth.uid()) = author_id
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  )
  with check (
    (select auth.uid()) = author_id
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  );

drop policy if exists "articles: contributors create" on public.articles;
create policy "articles: contributors create" on public.articles
  for insert with check (
    author_id = (select auth.uid())
    and (
      private.my_role() in ('writer', 'editor', 'admin')
      or private.is_digest_editor()
    )
    and (
      status in ('draft', 'awaiting_editor')
      or (status = 'published' and private.is_sole_digest_editor())
    )
  );

-- ─── Gate trigger ───────────────────────────────────────────────────────────

create or replace function private.enforce_article_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  -- SQL editor / service role: no end-user actor, no gate.
  if actor is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'published'
       and not (actor = new.author_id and private.is_sole_digest_editor(actor)) then
      raise exception 'Submit the article for another editor to approve';
    end if;
  end if;

  if new.status = 'awaiting_editor' then
    if new.assigned_editor_id is null then
      raise exception 'Assign a different editor';
    end if;
    if new.assigned_editor_id = new.author_id
       and not private.is_sole_digest_editor(new.author_id) then
      raise exception 'Assign a different editor';
    end if;
    if not private.is_digest_editor(new.assigned_editor_id) then
      raise exception 'Assignee must be an editor';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.assigned_editor_id is distinct from old.assigned_editor_id then
      if actor = new.author_id
         and old.status in ('draft', 'awaiting_writer', 'awaiting_editor')
         and new.status in ('draft', 'awaiting_writer', 'awaiting_editor') then
        null;
      elsif private.is_digest_admin(actor) then
        null;
      else
        raise exception 'Only an admin can reassign this article';
      end if;
      if new.assigned_editor_id = new.author_id
         and not private.is_sole_digest_editor(new.author_id) then
        raise exception 'Assign a different editor';
      end if;
    end if;

    if new.status = 'published' and old.status is distinct from 'published' then
      if actor = new.author_id then
        if not private.is_sole_digest_editor(actor) then
          raise exception 'You cannot publish your own article';
        end if;
      elsif actor is distinct from new.assigned_editor_id then
        raise exception 'Only the assigned editor can publish this article';
      end if;
      if not private.is_digest_editor(actor) then
        raise exception 'Only an editor can publish';
      end if;
    end if;

    if new.status = 'awaiting_writer' and old.status is distinct from 'awaiting_writer' then
      if actor = new.author_id or actor is distinct from old.assigned_editor_id then
        raise exception 'Only the assigned editor can send this back to the writer';
      end if;
    end if;

    if old.status = 'awaiting_editor'
       and new.status = 'draft'
       and actor is distinct from new.author_id
       and actor is distinct from old.assigned_editor_id
       and not private.is_digest_admin(actor) then
      raise exception 'Only the author, assigned editor, or an admin can return this to draft';
    end if;

    if old.status = 'published'
       and new.status is distinct from 'published'
       and not private.is_digest_editor(actor) then
      raise exception 'Only an editor can unpublish';
    end if;
  end if;

  return new;
end;
$$;

create trigger articles_enforce_gate
  before insert or update on public.articles
  for each row execute function private.enforce_article_gate();

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function private.notify(
  p_user uuid,
  p_type text,
  p_article uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, type, article_id, body)
  values (p_user, p_type, p_article, p_body);
end;
$$;

-- Editor currently responsible for a review (live revision or first draft).
create or replace function private.review_assignee(p_article uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (select r.assigned_editor_id
       from public.article_revisions r
      where r.article_id = p_article and r.state = 'awaiting_editor'),
    (select a.assigned_editor_id from public.articles a where a.id = p_article)
  );
$$;

-- ─── Workflow RPCs ──────────────────────────────────────────────────────────

create or replace function public.save_revision(
  p_article_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  current_state text;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.status <> 'published' then
    raise exception 'Only live articles use revisions';
  end if;
  if actor is distinct from a.author_id and not private.is_digest_editor(actor) then
    raise exception 'Not allowed to edit this article';
  end if;

  select state into current_state
  from public.article_revisions where article_id = p_article_id;

  if current_state = 'awaiting_editor' then
    raise exception 'This revision is with the editor';
  end if;

  insert into public.article_revisions (article_id, payload, state)
  values (p_article_id, p_payload, coalesce(current_state, 'draft'))
  on conflict (article_id) do update
    set payload = excluded.payload, updated_at = now();
end;
$$;

create or replace function public.submit_article(
  p_article_id uuid,
  p_editor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  r public.article_revisions;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the author can submit this article';
  end if;
  if p_editor is null then
    raise exception 'Assign a different editor';
  end if;
  if p_editor = actor and not private.is_sole_digest_editor(actor) then
    raise exception 'Assign a different editor';
  end if;
  if not private.is_digest_editor(p_editor) then
    raise exception 'Assignee must be an editor';
  end if;

  if a.status = 'published' then
    select * into r from public.article_revisions where article_id = p_article_id;
    if not found then
      raise exception 'Make an edit before submitting';
    end if;
    if r.state = 'awaiting_editor' then
      raise exception 'Already with the editor';
    end if;
    update public.article_revisions
      set state = 'awaiting_editor', assigned_editor_id = p_editor, updated_at = now()
      where article_id = p_article_id;
    perform private.notify(
      p_editor, 'review_requested', p_article_id,
      'Edit awaiting your review: ' || a.title
    );
  else
    if a.status not in ('draft', 'awaiting_writer') then
      raise exception 'Already with the editor';
    end if;
    update public.articles
      set status = 'awaiting_editor', assigned_editor_id = p_editor
      where id = p_article_id;
    perform private.notify(
      p_editor, 'review_requested', p_article_id,
      'New submission awaiting your review: ' || a.title
    );
  end if;
end;
$$;

create or replace function public.review_request_changes(
  p_article_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  r public.article_revisions;
  assignee uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  assignee := private.review_assignee(p_article_id);
  if actor is distinct from assignee or actor = a.author_id then
    raise exception 'Only the assigned editor can request changes';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    update public.article_revisions
      set state = 'awaiting_writer', updated_at = now()
      where article_id = p_article_id;
  elsif a.status = 'awaiting_editor' then
    update public.articles set status = 'awaiting_writer' where id = p_article_id;
  else
    raise exception 'Nothing to review';
  end if;

  if p_note is not null and char_length(trim(p_note)) > 0 then
    insert into public.article_review_comments (article_id, author_id, body)
    values (p_article_id, actor, trim(p_note));
  end if;

  perform private.notify(
    a.author_id, 'changes_requested', p_article_id,
    'Changes requested on: ' || a.title
  );
end;
$$;

create or replace function public.review_approve(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  r public.article_revisions;
  assignee uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if not private.is_digest_editor(actor) then
    raise exception 'Only an editor can approve';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    if actor is distinct from r.assigned_editor_id then
      raise exception 'Only the assigned editor can approve this edit';
    end if;
    if actor = a.author_id and not private.is_sole_digest_editor(actor) then
      raise exception 'You cannot approve your own edit';
    end if;
    update public.articles set
      title = coalesce(r.payload ->> 'title', title),
      dek = r.payload ->> 'dek',
      body = coalesce(r.payload -> 'body', body),
      cover_url = r.payload ->> 'cover_url',
      byline = nullif(trim(coalesce(r.payload ->> 'byline', '')), ''),
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id)
    where id = p_article_id;
    delete from public.article_revisions where article_id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Your edit is live: ' || a.title
    );
    return;
  end if;

  assignee := a.assigned_editor_id;
  if a.status = 'awaiting_editor' then
    if actor is distinct from assignee then
      raise exception 'Only the assigned editor can approve this article';
    end if;
    if actor = a.author_id and not private.is_sole_digest_editor(actor) then
      raise exception 'You cannot approve your own article';
    end if;
  elsif a.status in ('draft', 'awaiting_writer') then
    if not (actor = a.author_id and private.is_sole_digest_editor(actor)) then
      raise exception 'Submit this article for review first';
    end if;
  else
    raise exception 'Nothing to approve';
  end if;

  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, now()),
        assigned_editor_id = coalesce(assigned_editor_id, actor)
    where id = p_article_id;

  perform private.notify(
    a.author_id, 'approved', p_article_id,
    'Published: ' || a.title
  );
end;
$$;

create or replace function public.add_review_comment(
  p_article_id uuid,
  p_body text,
  p_anchor jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  assignee uuid;
  new_id uuid;
  target uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  assignee := private.review_assignee(p_article_id);
  if not (
    actor = a.author_id
    or actor = assignee
    or private.is_digest_editor(actor)
  ) then
    raise exception 'Not part of this review';
  end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then
    raise exception 'Write a comment';
  end if;

  insert into public.article_review_comments (article_id, author_id, body, anchor)
  values (p_article_id, actor, trim(p_body), p_anchor)
  returning id into new_id;

  target := case when actor = a.author_id then assignee else a.author_id end;
  perform private.notify(
    target, 'review_comment', p_article_id,
    'New comment on: ' || a.title
  );

  return new_id;
end;
$$;

create or replace function public.mark_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null;
$$;

revoke all on function public.save_revision(uuid, jsonb) from public;
revoke all on function public.submit_article(uuid, uuid) from public;
revoke all on function public.review_request_changes(uuid, text) from public;
revoke all on function public.review_approve(uuid) from public;
revoke all on function public.add_review_comment(uuid, text, jsonb) from public;
revoke all on function public.mark_notifications_read() from public;

grant execute on function public.save_revision(uuid, jsonb) to authenticated;
grant execute on function public.submit_article(uuid, uuid) to authenticated;
grant execute on function public.review_request_changes(uuid, text) to authenticated;
grant execute on function public.review_approve(uuid) to authenticated;
grant execute on function public.add_review_comment(uuid, text, jsonb) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
