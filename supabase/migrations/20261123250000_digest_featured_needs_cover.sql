-- Top News / featured packages need cover art. Text-only stories stay allowed otherwise.

update public.articles
set featured = false,
    updated_at = now()
where featured
  and (cover_url is null or length(trim(cover_url)) = 0);

alter table public.articles
  drop constraint if exists articles_featured_needs_cover;

alter table public.articles
  add constraint articles_featured_needs_cover
  check (
    not featured
    or (cover_url is not null and length(trim(cover_url)) > 0)
  );

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

  if p_kind in ('page_one', 'top_news', 'section_highlight')
     and (a.cover_url is null or length(trim(a.cover_url)) = 0) then
    raise exception 'Cover art is required for featured homepage placements';
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

  if p_kind = 'breaking' then
    update public.articles set breaking = true where id = p_article_id;
  elsif p_kind = 'top_news' then
    update public.articles set featured = true where id = p_article_id;
  end if;
end;
$$;
