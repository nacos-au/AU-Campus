-- Parked flow no longer uses articles.embargo_at. Hosted DBs that never had
-- (or dropped) the column break publish because review_approve still SETs it.
-- Strip embargo_at from approve / make-live paths.

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

create or replace function public.publish_parked_article(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if not private.is_digest_editor(actor) then
    raise exception 'Only an editor can make a parked story live';
  end if;
  if a.status is distinct from 'scheduled' then
    raise exception 'Only parked stories can be made live';
  end if;

  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, now()),
        updated_at = now()
    where id = p_article_id;

  perform private.notify(
    a.author_id, 'approved', p_article_id,
    'Now live: ' || a.title
  );
end;
$$;

revoke all on function public.review_approve(uuid, boolean) from public;
grant execute on function public.review_approve(uuid, boolean) to authenticated;

revoke all on function public.publish_parked_article(uuid) from public;
grant execute on function public.publish_parked_article(uuid) to authenticated;
