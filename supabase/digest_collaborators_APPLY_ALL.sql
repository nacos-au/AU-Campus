-- =============================================================================
-- Digest collaborative posts: co-authors + independent-editor review rules.
-- Safe to re-run.
-- Requires: digest_editor_continuity (is_assignable_desk_editor) and
-- digest_review_fix (snapshot_article / record_article_version).
-- =============================================================================

create or replace function private.is_assignable_desk_editor(uid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role in ('editor', 'admin')
      and coalesce(p.is_super_admin, false) = false
  );
$$;

create table if not exists public.article_collaborators (
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credit_order int not null default 1,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists article_collaborators_user_idx
  on public.article_collaborators (user_id);

alter table public.article_collaborators enable row level security;

drop policy if exists "article_collaborators: public read" on public.article_collaborators;
create policy "article_collaborators: public read" on public.article_collaborators
  for select using (true);

drop policy if exists "article_collaborators: owner manage" on public.article_collaborators;
create policy "article_collaborators: owner manage" on public.article_collaborators
  for all using (
    exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = auth.uid()
    )
    or private.is_digest_editor()
    or private.is_super_admin()
  )
  with check (
    exists (
      select 1 from public.articles a
      where a.id = article_id and a.author_id = auth.uid()
    )
    or private.is_digest_editor()
    or private.is_super_admin()
  );

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function private.is_article_collaborator(
  p_article_id uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select uid is not null and exists (
    select 1
    from public.article_collaborators c
    where c.article_id = p_article_id
      and c.user_id = uid
  );
$$;

create or replace function private.is_article_party(
  p_article_id uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select uid is not null and (
    exists (
      select 1 from public.articles a
      where a.id = p_article_id and a.author_id = uid
    )
    or private.is_article_collaborator(p_article_id, uid)
  );
$$;

create or replace function private.can_edit_article_as_writer(
  p_article_id uuid,
  uid uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_article_party(p_article_id, uid);
$$;

-- Independent desk editor: not author, not collaborator, not super-admin.
create or replace function private.pick_independent_editor(p_article_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select p.id
  from public.profiles p
  where p.role in ('editor', 'admin')
    and coalesce(p.is_super_admin, false) = false
    and not private.is_article_party(p_article_id, p.id)
  order by (
    select count(*)::int
    from public.articles a
    where a.assigned_editor_id = p.id
      and a.status = 'awaiting_editor'
  ) asc,
  (
    select count(*)::int
    from public.article_revisions r
    where r.assigned_editor_id = p.id
      and r.state = 'awaiting_editor'
  ) asc,
  random()
  limit 1;
$$;

-- ─── RLS: collaborators can read/edit drafts like the owner ─────────────────

drop policy if exists "articles: authors read own" on public.articles;
create policy "articles: authors read own" on public.articles
  for select using (
    (select auth.uid()) = author_id
    or private.is_article_collaborator(id)
  );

drop policy if exists "articles: authors edit unpublished" on public.articles;
create policy "articles: authors edit unpublished" on public.articles
  for update using (
    private.can_edit_article_as_writer(id)
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  )
  with check (
    private.can_edit_article_as_writer(id)
    and status in ('draft', 'awaiting_writer', 'awaiting_editor')
  );

drop policy if exists "articles: authors delete drafts" on public.articles;
create policy "articles: authors delete drafts" on public.articles
  for delete using (
    (select auth.uid()) = author_id
    and status = 'draft'
  );

-- Staff still cannot browse others' drafts
drop policy if exists "articles: staff read all" on public.articles;
create policy "articles: staff read all" on public.articles
  for select using (
    private.is_staff()
    and (
      status is distinct from 'draft'
      or author_id = auth.uid()
      or private.is_article_collaborator(id)
    )
  );

-- ─── Submit: owner only; exclude all parties from review pool ───────────────

drop function if exists public.submit_article(uuid);

create or replace function public.submit_article(
  p_article_id uuid,
  p_editor uuid default null
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
  editor_id uuid;
  sticky uuid;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.author_id is distinct from actor then
    raise exception 'Only the owner can submit this article';
  end if;

  select coalesce(
    (select assigned_editor_id
       from public.article_revisions
      where article_id = p_article_id
      limit 1),
    a.assigned_editor_id
  ) into sticky;

  if p_editor is not null then
    if not (
      private.is_super_admin(actor)
      or exists (
        select 1 from public.profiles p
        where p.id = actor and p.role = 'admin'
      )
      or exists (
        select 1 from public.app_roles ar
        where ar.user_id = actor and ar.app = 'digest' and ar.role = 'admin'
      )
    ) then
      raise exception 'Only an admin can choose a specific editor';
    end if;
    if private.is_article_collaborator(p_article_id, p_editor) then
      raise exception 'Collaborators cannot review this piece';
    end if;
    editor_id := p_editor;
  elsif sticky is not null
    and private.is_assignable_desk_editor(sticky)
    and not private.is_article_party(p_article_id, sticky)
  then
    editor_id := sticky;
  else
    editor_id := private.pick_independent_editor(p_article_id);
  end if;

  -- Path B: no independent editor → owner self-review through the queue
  if editor_id is null and private.is_digest_editor(actor) then
    editor_id := actor;
  end if;

  if editor_id is null then
    raise exception 'No editor is available to review this article';
  end if;
  if private.is_article_collaborator(p_article_id, editor_id) then
    raise exception 'Collaborators cannot review this piece';
  end if;
  if not private.is_digest_editor(editor_id) then
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
      set state = 'awaiting_editor',
          assigned_editor_id = editor_id,
          updated_at = now()
      where article_id = p_article_id;
    update public.articles
      set assigned_editor_id = editor_id,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      editor_id, 'review_requested', p_article_id,
      'Edit awaiting your review: ' || a.title
    );
  else
    if a.status not in ('draft', 'awaiting_writer', 'archived') then
      raise exception 'Already with the editor';
    end if;
    if a.status = 'archived' then
      raise exception 'Restore this article from archive before submitting';
    end if;
    update public.articles
      set status = 'awaiting_editor',
          assigned_editor_id = editor_id,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      editor_id, 'review_requested', p_article_id,
      case
        when a.status = 'awaiting_writer' then 'Revised piece ready for you: ' || a.title
        else 'New piece awaiting your review: ' || a.title
      end
    );
  end if;
end;
$$;

revoke all on function public.submit_article(uuid, uuid) from public;
grant execute on function public.submit_article(uuid, uuid) to authenticated;

-- ─── Review: collaborators never approve; owner may when self-assigned ──────

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

  if private.is_article_collaborator(p_article_id, actor) then
    raise exception 'Collaborators cannot review this piece';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    assignee := r.assigned_editor_id;
  else
    assignee := a.assigned_editor_id;
  end if;

  if actor is distinct from assignee then
    raise exception 'Only the assigned editor can request changes';
  end if;

  if found then
    update public.article_revisions
      set state = 'awaiting_writer',
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          updated_at = now()
      where article_id = p_article_id;
  else
    update public.articles
      set status = 'awaiting_writer',
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          editor_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), editor_note),
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
  end if;

  if a.author_id is distinct from actor then
    perform private.notify(
      a.author_id, 'changes_requested', p_article_id,
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Changes requested: ' || a.title)
    );
  end if;
end;
$$;

-- Patch approve author/collaborator gates (keep rest of review_approve from prior APPLY_ALL).
-- Re-define with collaborator rules; body mirrors digest_review_fix_APPLY_ALL.

drop function if exists public.review_approve(uuid, boolean);

create or replace function public.review_approve(
  p_article_id uuid,
  p_park boolean default false
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
  before_snap jsonb;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if not private.is_digest_editor(actor) then
    raise exception 'Only an editor can approve';
  end if;
  if private.is_article_collaborator(p_article_id, actor) then
    raise exception 'Collaborators cannot review this piece';
  end if;

  select * into r from public.article_revisions
    where article_id = p_article_id and state = 'awaiting_editor';

  if found then
    if actor is distinct from r.assigned_editor_id then
      raise exception 'Only the assigned editor can approve this edit';
    end if;

    before_snap := private.snapshot_article(a);
    perform private.record_article_version(
      p_article_id, before_snap, 'Before approved edit', actor
    );

    update public.articles set
      title = coalesce(r.payload ->> 'title', title),
      dek = r.payload ->> 'dek',
      body = coalesce(r.payload -> 'body', body),
      cover_url = r.payload ->> 'cover_url',
      byline = nullif(trim(coalesce(r.payload ->> 'byline', '')), ''),
      byline_mode = case
        when r.payload ->> 'byline_mode' in ('personal', 'alias')
          then r.payload ->> 'byline_mode'
        else byline_mode
      end,
      series_id = case
        when r.payload ? 'series_id' and nullif(trim(r.payload ->> 'series_id'), '') is null
          then null
        when r.payload ? 'series_id'
          then (r.payload ->> 'series_id')::uuid
        else series_id
      end,
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id),
      sponsored_by = null,
      content_updated_at = now(),
      updated_at = now()
    where id = p_article_id;

    select * into a from public.articles where id = p_article_id;
    perform private.record_article_version(
      p_article_id,
      private.snapshot_article(a),
      'Approved edit',
      actor
    );

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
    -- Owner may approve when self-assigned (Path B / sole). Collaborators blocked above.
  elsif a.status in ('draft', 'awaiting_writer') then
    if not (actor = a.author_id and private.is_sole_digest_editor(actor)) then
      raise exception 'Submit this article for review first';
    end if;
  else
    raise exception 'Nothing to approve';
  end if;

  before_snap := private.snapshot_article(a);
  perform private.record_article_version(
    p_article_id, before_snap,
    case when p_park then 'Approved & parked' else 'Approved for release' end,
    actor
  );

  if p_park then
    update public.articles
      set status = 'scheduled',
          embargo_at = null,
          published_at = null,
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Approved and parked (not live yet): ' || a.title
    );
  else
    update public.articles
      set status = 'published',
          embargo_at = null,
          published_at = coalesce(published_at, now()),
          assigned_editor_id = coalesce(assigned_editor_id, actor),
          review_lock_by = null,
          review_lock_at = null,
          updated_at = now()
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Published: ' || a.title
    );
  end if;
end;
$$;

revoke all on function public.review_approve(uuid, boolean) from public;
grant execute on function public.review_approve(uuid, boolean) to authenticated;
