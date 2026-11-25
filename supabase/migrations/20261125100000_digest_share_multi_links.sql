-- Allow multiple active private draft share links per article.
-- Deactivate individually by link id.

drop index if exists public.article_share_links_one_active;

create index if not exists article_share_links_active_idx
  on public.article_share_links (article_id)
  where revoked_at is null;

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

  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

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

create or replace function public.deactivate_article_share_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  link public.article_share_links;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;
  select * into link from public.article_share_links where id = p_link_id;
  if not found then
    raise exception 'Share link not found';
  end if;
  if not private.can_manage_article_share(link.article_id, actor) then
    raise exception 'Not allowed';
  end if;
  update public.article_share_links
  set revoked_at = now()
  where id = p_link_id
    and revoked_at is null;
end;
$$;

-- Must DROP first: CREATE OR REPLACE cannot rename p_article_id → p_link_id.
drop function if exists public.revoke_article_share_link(uuid);

create or replace function public.revoke_article_share_link(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.deactivate_article_share_link(p_link_id);
end;
$$;

revoke all on function public.create_article_share_link(uuid, text) from public;
grant execute on function public.create_article_share_link(uuid, text) to authenticated;

revoke all on function public.deactivate_article_share_link(uuid) from public;
grant execute on function public.deactivate_article_share_link(uuid) to authenticated;

revoke all on function public.revoke_article_share_link(uuid) from public;
grant execute on function public.revoke_article_share_link(uuid) to authenticated;

notify pgrst, 'reload schema';
