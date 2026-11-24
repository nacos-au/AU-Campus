-- =============================================================================
-- Digest writer motivation board: save_count + engagement RPC.
-- Safe to re-run.
-- =============================================================================

alter table public.articles
  add column if not exists save_count int not null default 0;

-- Backfill from existing saves
update public.articles a
set save_count = sub.n
from (
  select article_id, count(*)::int as n
  from public.article_saves
  group by article_id
) sub
where a.id = sub.article_id
  and a.save_count is distinct from sub.n;

create or replace function private.sync_save_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set save_count = save_count + 1 where id = new.article_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.articles set save_count = greatest(save_count - 1, 0) where id = old.article_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists article_saves_count on public.article_saves;
create trigger article_saves_count
  after insert or delete on public.article_saves
  for each row execute function private.sync_save_count();

-- Newsroom board: per-writer live articles / likes / saves (owner ∪ collaborator credit)
create or replace function public.writer_engagement_board()
returns table (
  user_id uuid,
  display_name text,
  username text,
  live_articles int,
  likes_received int,
  saves_received int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Sign in required';
  end if;
  if not (
    private.is_super_admin(actor)
    or exists (
      select 1 from public.profiles p
      where p.id = actor
        and p.role in ('writer', 'editor', 'admin')
    )
  ) then
    raise exception 'Only newsroom staff can view the board';
  end if;

  return query
  with credited as (
    select
      a.id as article_id,
      a.author_id as writer_id,
      coalesce(a.like_count, 0) as like_count,
      coalesce(a.save_count, 0) as save_count
    from public.articles a
    where a.status = 'published'
    union
    select
      a.id,
      c.user_id,
      coalesce(a.like_count, 0),
      coalesce(a.save_count, 0)
    from public.articles a
    join public.article_collaborators c on c.article_id = a.id
    where a.status = 'published'
  ),
  rolled as (
    select
      c.writer_id,
      count(distinct c.article_id)::int as live_articles,
      coalesce(sum(c.like_count), 0)::int as likes_received,
      coalesce(sum(c.save_count), 0)::int as saves_received
    from credited c
    group by c.writer_id
  )
  select
    p.id,
    p.display_name,
    p.username,
    r.live_articles,
    r.likes_received,
    r.saves_received
  from rolled r
  join public.profiles p on p.id = r.writer_id
  where p.role in ('writer', 'editor', 'admin')
     or coalesce(p.is_super_admin, false)
  order by r.live_articles desc, r.likes_received desc, r.saves_received desc, p.display_name asc;
end;
$$;

revoke all on function public.writer_engagement_board() from public;
grant execute on function public.writer_engagement_board() to authenticated;
