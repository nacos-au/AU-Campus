-- =============================================================================
-- Digest private draft share links. Safe to re-run.
-- Fixes: "Sharing is unavailable until the database update is applied."
-- Additive only. Does not alter submit / review_approve / collaborators.
-- =============================================================================

create table if not exists public.article_share_links (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  token text not null unique,
  mode text not null check (mode in ('live', 'snapshot')),
  snapshot jsonb,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists article_share_links_one_active
  on public.article_share_links (article_id)
  where revoked_at is null;

create index if not exists article_share_links_article_idx
  on public.article_share_links (article_id);

create table if not exists public.article_share_claims (
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  link_id uuid not null references public.article_share_links (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists article_share_claims_user_idx
  on public.article_share_claims (user_id);

alter table public.article_share_links enable row level security;
alter table public.article_share_claims enable row level security;

create or replace function private.is_article_share_claimant(
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
    from public.article_share_claims c
    where c.article_id = p_article_id
      and c.user_id = uid
  );
$$;

create or replace function private.can_manage_article_share(
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
    private.is_staff()
    or exists (
      select 1 from public.articles a
      where a.id = p_article_id and a.author_id = uid
    )
  );
$$;

drop policy if exists "articles: share claimants read" on public.articles;
create policy "articles: share claimants read" on public.articles
  for select using (private.is_article_share_claimant(id));

drop policy if exists "share_links: manage" on public.article_share_links;
create policy "share_links: manage" on public.article_share_links
  for all using (private.can_manage_article_share(article_id))
  with check (private.can_manage_article_share(article_id));

drop policy if exists "share_claims: read" on public.article_share_claims;
create policy "share_claims: read" on public.article_share_claims
  for select using (
    user_id = (select auth.uid())
    or private.can_manage_article_share(article_id)
  );

drop policy if exists "share_claims: manage" on public.article_share_claims;
create policy "share_claims: manage" on public.article_share_claims
  for all using (private.can_manage_article_share(article_id))
  with check (private.can_manage_article_share(article_id));

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
      'byline', a.byline,
      'section_id', a.section_id,
      'language', a.language
    );
  end if;

  return payload || jsonb_build_object('captured_at', now());
end;
$$;

create or replace function public.create_article_share_link(
  p_article_id uuid,
  p_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  a public.articles;
  tok text;
  snap jsonb;
  link_id uuid;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  if p_mode not in ('live', 'snapshot') then
    raise exception 'Invalid share mode';
  end if;
  if not private.can_manage_article_share(p_article_id, actor) then
    raise exception 'Not allowed';
  end if;

  select * into a from public.articles where id = p_article_id;
  if not found then
    raise exception 'Article not found';
  end if;
  if a.status not in ('draft', 'awaiting_editor', 'awaiting_writer', 'scheduled') then
    raise exception 'Only unpublished pieces can be shared privately';
  end if;

  update public.article_share_links
  set revoked_at = now()
  where article_id = p_article_id
    and revoked_at is null;

  tok := translate(
    encode(gen_random_bytes(24), 'base64'),
    '+/',
    '-_'
  );
  tok := rtrim(tok, '=');

  if p_mode = 'snapshot' then
    snap := private.capture_article_share_snapshot(p_article_id);
  else
    snap := null;
  end if;

  insert into public.article_share_links (
    article_id, token, mode, snapshot, created_by
  ) values (
    p_article_id, tok, p_mode, snap, actor
  )
  returning id into link_id;

  return jsonb_build_object(
    'id', link_id,
    'token', tok,
    'mode', p_mode,
    'captured_at', snap ->> 'captured_at'
  );
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
    'byline', content ->> 'byline',
    'captured_at', content ->> 'captured_at'
  );
end;
$$;

-- Returning visitors (after link rotate) open via article id + existing claim.
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
    'byline', content ->> 'byline',
    'captured_at', content ->> 'captured_at'
  );
end;
$$;

create or replace function public.revoke_article_share_claim(
  p_article_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not private.can_manage_article_share(p_article_id, actor) then
    raise exception 'Not allowed';
  end if;
  delete from public.article_share_claims
  where article_id = p_article_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.revoke_article_share_link(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if not private.can_manage_article_share(p_article_id, actor) then
    raise exception 'Not allowed';
  end if;
  update public.article_share_links
  set revoked_at = now()
  where article_id = p_article_id
    and revoked_at is null;
end;
$$;

create or replace function private.articles_share_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('published', 'withdrawn', 'archived')
     and old.status is distinct from new.status then
    update public.article_share_links
    set revoked_at = now()
    where article_id = new.id
      and revoked_at is null;
    delete from public.article_share_claims
    where article_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists articles_share_lifecycle on public.articles;
create trigger articles_share_lifecycle
  after update of status on public.articles
  for each row
  execute function private.articles_share_lifecycle();

revoke all on function public.create_article_share_link(uuid, text) from public;
grant execute on function public.create_article_share_link(uuid, text) to authenticated;

revoke all on function public.open_article_share_link(text) from public;
grant execute on function public.open_article_share_link(text) to authenticated;

revoke all on function public.open_shared_article(uuid) from public;
grant execute on function public.open_shared_article(uuid) to authenticated;

revoke all on function public.revoke_article_share_claim(uuid, uuid) from public;
grant execute on function public.revoke_article_share_claim(uuid, uuid) to authenticated;

revoke all on function public.revoke_article_share_link(uuid) from public;
grant execute on function public.revoke_article_share_link(uuid) to authenticated;
