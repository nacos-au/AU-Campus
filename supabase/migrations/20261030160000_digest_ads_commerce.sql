-- =============================================================================
-- Digest advertising
--   * ads become sellable bookings: advertiser, flight dates, weight, price,
--     Paystack payment, review status, impression/click counters
--   * sponsored articles ("Presented by …")
-- =============================================================================

alter table public.ads
  add column if not exists advertiser_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists weight int not null default 1 check (weight between 1 and 10),
  add column if not exists price_kobo int not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists paystack_reference text unique,
  add column if not exists impressions int not null default 0,
  add column if not exists clicks int not null default 0,
  add column if not exists status text not null default 'approved'
    check (status in ('pending_payment', 'pending_review', 'approved', 'rejected'));

create index if not exists ads_live_idx on public.ads (slot, active, status);

-- Public only ever sees approved, active creatives.
drop policy if exists "ads: public read active" on public.ads;
create policy "ads: public read active" on public.ads
  for select using (active = true and status = 'approved');

alter table public.articles
  add column if not exists sponsored_by text;

-- ─── Counters (callable by anyone; only increments) ─────────────────────────

create or replace function public.ad_impression(p_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ads set impressions = impressions + 1 where id = any (p_ids);
$$;

create or replace function public.ad_click(p_id uuid)
returns text
language sql
security definer
set search_path = ''
as $$
  update public.ads set clicks = clicks + 1 where id = p_id returning target_url;
$$;

revoke all on function public.ad_impression(uuid[]) from public;
revoke all on function public.ad_click(uuid) from public;
grant execute on function public.ad_impression(uuid[]) to anon, authenticated;
grant execute on function public.ad_click(uuid) to anon, authenticated;

-- Approving a revision also carries the sponsor label.
create or replace function public.review_approve(p_article_id uuid)
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
      sponsored_by = nullif(trim(coalesce(r.payload ->> 'sponsored_by', '')), ''),
      language = coalesce(r.payload ->> 'language', language),
      section_id = coalesce((r.payload ->> 'section_id')::int, section_id)
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

  update public.articles
    set status = 'published',
        published_at = coalesce(published_at, now()),
        assigned_editor_id = coalesce(assigned_editor_id, actor)
    where id = p_article_id;

  perform private.notify(
    a.author_id, 'approved', p_article_id,
    'Published: ' || a.title
  );
end;
$$;
