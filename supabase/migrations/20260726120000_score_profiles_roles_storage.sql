-- AU Score: extend Digest profiles, platform roles, and image storage buckets
-- Safe to run on a project that already has Digest initial_schema applied.

-- ─── Extend shared profiles (Digest + Score) ───────────────────────────────

alter table public.profiles
  add column if not exists matric_number text,
  add column if not exists department_id uuid,
  add column if not exists avatar_url text;

create unique index if not exists profiles_matric_number_key
  on public.profiles (matric_number)
  where matric_number is not null;

-- ─── Score platform roles ───────────────────────────────────────────────────

create table if not exists public.score_user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('platform_owner', 'super_admin', 'admin', 'student')),
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.score_user_roles enable row level security;

create table if not exists public.score_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  all_sports boolean not null default false,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.score_admins enable row level security;

create table if not exists public.score_admin_sports (
  user_id uuid not null references public.score_admins (user_id) on delete cascade,
  sport_id uuid not null,
  primary key (user_id, sport_id)
);

alter table public.score_admin_sports enable row level security;

-- Role helpers (security definer)
create or replace function private.is_platform_owner(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.score_user_roles
    where user_id = uid and role = 'platform_owner'
  );
$$;

create or replace function private.is_score_super_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_platform_owner(uid)
    or exists (
      select 1 from public.score_user_roles
      where user_id = uid and role = 'super_admin'
    );
$$;

create policy "score_user_roles: owner read all"
  on public.score_user_roles for select
  using (private.is_platform_owner() or private.is_score_super_admin() or user_id = auth.uid());

create policy "score_user_roles: owner manage"
  on public.score_user_roles for all
  using (private.is_platform_owner())
  with check (private.is_platform_owner());

create policy "score_admins: staff read"
  on public.score_admins for select
  using (private.is_score_super_admin() or user_id = auth.uid());

create policy "score_admins: super admin manage"
  on public.score_admins for all
  using (private.is_score_super_admin())
  with check (private.is_score_super_admin());

create policy "score_admin_sports: staff read"
  on public.score_admin_sports for select
  using (
    private.is_score_super_admin()
    or user_id = auth.uid()
  );

create policy "score_admin_sports: super admin manage"
  on public.score_admin_sports for all
  using (private.is_score_super_admin())
  with check (private.is_score_super_admin());

-- ─── Image storage buckets ──────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('club-logos', 'club-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('player-avatars', 'player-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "club-logos: public read"
  on storage.objects for select
  using (bucket_id = 'club-logos');

create policy "club-logos: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'club-logos' and auth.role() = 'authenticated');

create policy "club-logos: owner update"
  on storage.objects for update
  using (bucket_id = 'club-logos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "player-avatars: public read"
  on storage.objects for select
  using (bucket_id = 'player-avatars');

create policy "player-avatars: authenticated upload"
  on storage.objects for insert
  with check (bucket_id = 'player-avatars' and auth.role() = 'authenticated');

create policy "player-avatars: owner update"
  on storage.objects for update
  using (bucket_id = 'player-avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: own upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars: own update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Owner seed: run scripts/seed-owner.ts with PLATFORM_OWNER_EMAIL + PLATFORM_OWNER_PASSWORD
-- after the owner signs up or is created via service role.
