-- Move News desk content into Academics, then remove News.

insert into public.sections (slug, name, position)
values (
  'academics',
  'Academics',
  coalesce((select position from public.sections where slug = 'news' limit 1), 1)
)
on conflict (slug) do update
  set name = excluded.name,
      position = excluded.position;

update public.articles
set section_id = (select id from public.sections where slug = 'academics' limit 1),
    updated_at = now()
where section_id = (select id from public.sections where slug = 'news' limit 1);

do $$
begin
  update public.weekly_issue_slots
  set section_id = (select id from public.sections where slug = 'academics' limit 1)
  where section_id = (select id from public.sections where slug = 'news' limit 1);
exception
  when undefined_table then null;
end $$;

delete from public.sections
where slug = 'news'
  and not exists (
    select 1 from public.articles a
    where a.section_id = sections.id
  );

update public.sections
set position = case slug
  when 'academics' then 1
  when 'campus' then 2
  when 'sports' then 3
  when 'technology' then 4
  else position
end
where slug in ('academics', 'campus', 'sports', 'technology');
