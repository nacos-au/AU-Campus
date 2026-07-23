-- ============================================================================
-- AU Digest: initial schema
-- Roles: reader -> writer -> editor -> admin
-- All tables have RLS enabled. Purchases are written only by the service role
-- (Paystack webhook / server-side verification). Edition PDF paths live in a
-- separate table with no client policies so they can never leak through the
-- Data API.
-- ============================================================================

-- Private schema for security-definer helpers (never exposed via the API).
create schema if not exists private;

-- ─── Profiles ───────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'reader'
    check (role in ('reader', 'writer', 'editor', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile on signup.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Role helper. SECURITY DEFINER so RLS policies on profiles don't recurse.
create function private.my_role()
returns text
language sql
security definer set search_path = ''
stable
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())),
    'anon'
  );
$$;

create function private.is_staff()
returns boolean
language sql stable
as $$ select private.my_role() in ('editor', 'admin') $$;

-- Profiles hold no sensitive data (no email); public read enables bylines.
create policy "profiles: public read" on public.profiles
  for select using (true);

-- Users may edit their profile but never their own role (my_role() reads the
-- pre-update snapshot via a security-definer function).
create policy "profiles: update own name" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role = private.my_role());

create policy "profiles: admin update" on public.profiles
  for update using (private.my_role() = 'admin')
  with check (true);

-- ─── Sections ───────────────────────────────────────────────────────────────

create table public.sections (
  id serial primary key,
  slug text not null unique,
  name text not null,
  position int not null default 0
);

alter table public.sections enable row level security;

create policy "sections: public read" on public.sections
  for select using (true);

create policy "sections: staff manage" on public.sections
  for all using (private.is_staff()) with check (private.is_staff());

-- ─── Articles ───────────────────────────────────────────────────────────────

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  dek text,
  body jsonb not null default '{"type":"doc","content":[]}',
  cover_url text,
  section_id int not null references public.sections (id),
  author_id uuid not null references public.profiles (id) default auth.uid(),
  language text not null default 'en',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'published', 'rejected')),
  featured boolean not null default false,
  editor_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_published_at on public.articles (status, published_at desc);
create index articles_section on public.articles (section_id);

alter table public.articles enable row level security;

create policy "articles: public read published" on public.articles
  for select using (status = 'published');

create policy "articles: authors read own" on public.articles
  for select using ((select auth.uid()) = author_id);

create policy "articles: staff read all" on public.articles
  for select using (private.is_staff());

-- Writers create drafts they own; they cannot self-publish.
create policy "articles: writers create" on public.articles
  for insert with check (
    private.my_role() in ('writer', 'editor', 'admin')
    and author_id = (select auth.uid())
    and status in ('draft', 'submitted')
  );

create policy "articles: authors edit unpublished" on public.articles
  for update using (
    (select auth.uid()) = author_id
    and status in ('draft', 'submitted', 'rejected')
  )
  with check (
    (select auth.uid()) = author_id
    and status in ('draft', 'submitted')
  );

create policy "articles: staff edit all" on public.articles
  for update using (private.is_staff()) with check (private.is_staff());

create policy "articles: authors delete drafts" on public.articles
  for delete using ((select auth.uid()) = author_id and status = 'draft');

create policy "articles: staff delete" on public.articles
  for delete using (private.is_staff());

create function private.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_touch before update on public.articles
  for each row execute function private.touch_updated_at();

-- ─── Editions (paid issues) ─────────────────────────────────────────────────

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  issue_date date not null default current_date,
  price_kobo int not null check (price_kobo >= 0),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.editions enable row level security;

create policy "editions: public read published" on public.editions
  for select using (published = true);

create policy "editions: staff manage" on public.editions
  for all using (private.is_staff()) with check (private.is_staff());

-- PDF paths are isolated here. Staff can manage; readers have NO policies, so
-- the secure path is only reachable through the service-role file proxy.
create table public.edition_files (
  edition_id uuid primary key references public.editions (id) on delete cascade,
  pdf_path text not null,
  page_count int,
  updated_at timestamptz not null default now()
);

alter table public.edition_files enable row level security;

create policy "edition_files: staff manage" on public.edition_files
  for all using (private.is_staff()) with check (private.is_staff());

-- ─── Purchases ──────────────────────────────────────────────────────────────

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  edition_id uuid not null references public.editions (id) on delete cascade,
  reference text not null unique,
  amount_kobo int not null,
  paid_at timestamptz not null default now(),
  unique (user_id, edition_id)
);

alter table public.purchases enable row level security;

-- Read-only for owners and staff. No INSERT/UPDATE policies on purpose:
-- rows are written exclusively by the service role after Paystack verification.
create policy "purchases: read own" on public.purchases
  for select using ((select auth.uid()) = user_id);

create policy "purchases: staff read all" on public.purchases
  for select using (private.is_staff());

-- ─── Ads ────────────────────────────────────────────────────────────────────

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  slot text not null check (slot in ('leaderboard', 'sidebar', 'infeed')),
  image_url text not null,
  target_url text not null,
  label text not null default 'Advertisement',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ads enable row level security;

create policy "ads: public read active" on public.ads
  for select using (active = true);

create policy "ads: staff manage" on public.ads
  for all using (private.is_staff()) with check (private.is_staff());

-- ─── Storage buckets ────────────────────────────────────────────────────────

-- Public bucket for article covers, edition covers and ad creatives.
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true);

-- Private bucket for edition PDFs. No public access; downloads go through
-- the authenticated Next.js proxy using the service role.
insert into storage.buckets (id, name, public)
values ('editions', 'editions', false);

create policy "covers: public read" on storage.objects
  for select using (bucket_id = 'covers');

create policy "covers: contributors write" on storage.objects
  for insert with check (
    bucket_id = 'covers'
    and private.my_role() in ('writer', 'editor', 'admin')
  );

create policy "covers: contributors update" on storage.objects
  for update using (
    bucket_id = 'covers'
    and private.my_role() in ('writer', 'editor', 'admin')
  );

create policy "covers: staff delete" on storage.objects
  for delete using (bucket_id = 'covers' and private.is_staff());

-- Editors upload edition PDFs. Staff-only SELECT exists because storage
-- upsert requires INSERT + SELECT + UPDATE; readers still have no path to
-- these objects (no anon/reader policy, bucket is private).
create policy "editions bucket: staff read" on storage.objects
  for select using (bucket_id = 'editions' and private.is_staff());

create policy "editions bucket: staff upload" on storage.objects
  for insert with check (bucket_id = 'editions' and private.is_staff());

create policy "editions bucket: staff update" on storage.objects
  for update using (bucket_id = 'editions' and private.is_staff());

create policy "editions bucket: staff delete" on storage.objects
  for delete using (bucket_id = 'editions' and private.is_staff());
