-- =============================================================================
-- Digest: cover_caption for article cover image descriptions (ImageInfo UI).
-- Safe to re-run in the Supabase SQL editor.
-- =============================================================================

alter table public.articles
  add column if not exists cover_caption text;

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
    'cover_caption', a.cover_caption,
    'byline', a.byline,
    'byline_mode', a.byline_mode,
    'series_id', a.series_id,
    'section_id', a.section_id,
    'language', a.language,
    'status', a.status,
    'published_at', a.published_at
  );
$$;

-- Approve edits: copy cover_caption from revision payload (same as cover_url).
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
      cover_caption = case
        when r.payload ? 'cover_caption'
          then nullif(trim(r.payload ->> 'cover_caption'), '')
        else cover_caption
      end,
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
    perform private.ensure_article_public_slug(p_article_id);
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
    perform private.ensure_article_public_slug(p_article_id);
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
    perform private.ensure_article_public_slug(p_article_id);
    perform private.notify(
      a.author_id, 'approved', p_article_id,
      'Published: ' || a.title
    );
  end if;
end;
$$;

revoke all on function public.review_approve(uuid, boolean) from public;
grant execute on function public.review_approve(uuid, boolean) to authenticated;

-- Share: include cover_caption in live fallback payload + RPC response.
create or replace function private.capture_article_share_snapshot(p_article_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  a public.articles;
  r public.article_revisions;
  payload jsonb;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  select * into r from public.article_revisions where article_id = p_article_id;
  if found and r.payload is not null then
    payload := r.payload;
  else
    payload := jsonb_build_object(
      'title', a.title,
      'dek', a.dek,
      'body', a.body,
      'cover_url', a.cover_url,
      'cover_caption', a.cover_caption,
      'byline', a.byline,
      'section_id', a.section_id,
      'language', a.language
    );
  end if;

  return payload || jsonb_build_object('captured_at', now());
end;
$$;

create or replace function public.open_article_share_link(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  link public.article_share_links;
  a public.articles;
  r public.article_revisions;
  content jsonb;
  section_name text;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'Invalid share link';
  end if;

  select * into link
  from public.article_share_links
  where token = p_token
    and revoked_at is null;
  if not found then
    raise exception 'This share link is invalid or has been rotated';
  end if;

  select * into a from public.articles where id = link.article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  if a.status = 'published' then
    return jsonb_build_object(
      'redirect_slug', a.slug,
      'status', a.status
    );
  end if;

  if a.status in ('withdrawn', 'archived') then
    raise exception 'This piece is no longer available';
  end if;

  insert into public.article_share_claims (article_id, user_id, link_id)
  values (a.id, actor, link.id)
  on conflict (article_id, user_id) do update
    set link_id = excluded.link_id;

  select s.name into section_name
  from public.sections s
  where s.id = a.section_id;

  if link.mode = 'snapshot' then
    content := coalesce(link.snapshot, '{}'::jsonb);
  else
    select * into r from public.article_revisions where article_id = a.id;
    if found and r.payload is not null then
      content := r.payload;
    else
      content := jsonb_build_object(
        'title', a.title,
        'dek', a.dek,
        'body', a.body,
        'cover_url', a.cover_url,
        'cover_caption', a.cover_caption,
        'byline', a.byline,
        'section_id', a.section_id,
        'language', a.language
      );
    end if;
  end if;

  return jsonb_build_object(
    'article_id', a.id,
    'mode', link.mode,
    'status', a.status,
    'slug', a.slug,
    'section_name', section_name,
    'title', coalesce(content ->> 'title', a.title),
    'dek', content ->> 'dek',
    'body', coalesce(content -> 'body', a.body),
    'cover_url', content ->> 'cover_url',
    'cover_caption', content ->> 'cover_caption',
    'byline', content ->> 'byline',
    'captured_at', content ->> 'captured_at'
  );
end;
$$;

create or replace function public.open_shared_article(p_article_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  claim public.article_share_claims;
  link public.article_share_links;
  a public.articles;
  r public.article_revisions;
  content jsonb;
  section_name text;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  select * into claim
  from public.article_share_claims
  where article_id = p_article_id
    and user_id = actor;
  if not found then
    raise exception 'You do not have access to this draft';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;

  if a.status = 'published' then
    return jsonb_build_object(
      'redirect_slug', a.slug,
      'status', a.status
    );
  end if;
  if a.status in ('withdrawn', 'archived') then
    raise exception 'This piece is no longer available';
  end if;

  select * into link from public.article_share_links where id = claim.link_id;

  select s.name into section_name
  from public.sections s
  where s.id = a.section_id;

  if link.mode = 'snapshot' then
    content := coalesce(link.snapshot, '{}'::jsonb);
  else
    select * into r from public.article_revisions where article_id = a.id;
    if found and r.payload is not null then
      content := r.payload;
    else
      content := jsonb_build_object(
        'title', a.title,
        'dek', a.dek,
        'body', a.body,
        'cover_url', a.cover_url,
        'cover_caption', a.cover_caption,
        'byline', a.byline,
        'section_id', a.section_id,
        'language', a.language
      );
    end if;
  end if;

  return jsonb_build_object(
    'article_id', a.id,
    'mode', coalesce(link.mode, 'live'),
    'status', a.status,
    'slug', a.slug,
    'section_name', section_name,
    'title', coalesce(content ->> 'title', a.title),
    'dek', content ->> 'dek',
    'body', coalesce(content -> 'body', a.body),
    'cover_url', content ->> 'cover_url',
    'cover_caption', content ->> 'cover_caption',
    'byline', content ->> 'byline',
    'captured_at', content ->> 'captured_at'
  );
end;
$$;

revoke all on function public.open_article_share_link(text) from public;
grant execute on function public.open_article_share_link(text) to authenticated;
revoke all on function public.open_shared_article(uuid) from public;
grant execute on function public.open_shared_article(uuid) to authenticated;
