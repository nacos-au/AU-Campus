-- Digest: short_code for /a/{code}/{title-stem} public URLs.

alter table public.articles
  add column if not exists short_code text;

create unique index if not exists articles_short_code_uidx
  on public.articles (short_code)
  where short_code is not null;

create or replace function private.ensure_article_short_code(p_article_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.articles;
  candidate text;
  n int := 0;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    return null;
  end if;

  if a.short_code is not null and length(trim(a.short_code)) > 0 then
    return a.short_code;
  end if;

  loop
    n := n + 1;
    if n = 1 then
      candidate := substr(replace(a.id::text, '-', ''), 1, 8);
    else
      candidate := substr(md5(a.id::text || n::text), 1, 8);
    end if;
    candidate := lower(candidate);

    begin
      update public.articles
        set short_code = candidate,
            updated_at = now()
      where id = p_article_id
        and short_code is null;
      exit;
    exception
      when unique_violation then
        if n >= 12 then
          raise;
        end if;
    end;

    select short_code into candidate from public.articles where id = p_article_id;
    if candidate is not null then
      return candidate;
    end if;
  end loop;

  select short_code into candidate from public.articles where id = p_article_id;
  return candidate;
end;
$$;

create or replace function private.ensure_article_public_slug(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.articles;
  stem text;
  suffix text;
  candidate text;
begin
  select * into a from public.articles where id = p_article_id;
  if not found then
    return;
  end if;

  perform private.ensure_article_short_code(p_article_id);

  if a.slug is not null
     and a.slug !~* '^untitled-draft($|-)'
     and length(trim(a.slug)) > 0 then
    return;
  end if;

  stem := private.slugify_title(a.title);
  if stem = '' or stem = 'untitled-draft' then
    stem := 'story';
  end if;
  suffix := substr(replace(a.id::text, '-', ''), 1, 8);
  candidate := left(stem || '-' || suffix, 96);

  update public.articles
  set slug = candidate,
      updated_at = now()
  where id = p_article_id;
end;
$$;

do $$
declare
  r record;
begin
  for r in
    select id from public.articles
    where short_code is null
      and status in ('published', 'scheduled')
  loop
    perform private.ensure_article_short_code(r.id);
  end loop;
end $$;
