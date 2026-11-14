-- Article embargo / scheduled go-live (mirrors digest_embargo_APPLY_ALL.sql)

alter table public.articles
  add column if not exists embargo_at timestamptz;

create index if not exists articles_embargo_due_idx
  on public.articles (embargo_at)
  where status = 'scheduled';

drop trigger if exists articles_enforce_gate on public.articles;

alter table public.articles drop constraint if exists articles_status_check;

alter table public.articles
  add constraint articles_status_check
  check (status in (
    'draft',
    'awaiting_editor',
    'awaiting_writer',
    'published',
    'scheduled',
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

create or replace function public.promote_due_embargoes()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, embargo_at, now())
    where status = 'scheduled'
      and embargo_at is not null
      and embargo_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.promote_due_embargoes() from public;
grant execute on function public.promote_due_embargoes() to anon, authenticated;

create or replace function public.review_approve(
  p_article_id uuid,
  p_embargo_at timestamptz default null
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
  go_live_at timestamptz;
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
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id),
      sponsored_by = null
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

  go_live_at := p_embargo_at;

  if go_live_at is not null and go_live_at > now() then
    update public.articles
      set status = 'scheduled',
          embargo_at = go_live_at,
          published_at = go_live_at,
          assigned_editor_id = coalesce(assigned_editor_id, actor)
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Embargoed until ' || to_char(go_live_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC: ' || a.title
    );
  else
    update public.articles
      set status = 'published',
          embargo_at = null,
          published_at = coalesce(published_at, now()),
          assigned_editor_id = coalesce(assigned_editor_id, actor)
      where id = p_article_id;
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Published: ' || a.title
    );
  end if;
end;
$$;

create or replace function public.review_approve(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.review_approve(p_article_id, null);
end;
$$;

revoke all on function public.review_approve(uuid) from public;
revoke all on function public.review_approve(uuid, timestamptz) from public;
grant execute on function public.review_approve(uuid) to authenticated;
grant execute on function public.review_approve(uuid, timestamptz) to authenticated;
