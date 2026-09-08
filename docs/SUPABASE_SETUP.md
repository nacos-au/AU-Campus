# Supabase setup — AU Campus monorepo

One Supabase project powers **Digest** and **Score**. Campus is a static hub (no DB).

## 1. Create project

1. Go to [supabase.com](https://supabase.com) → New project (or use local Docker).
2. Note **Project URL**, **anon key**, **service_role key**.

## 2. Local development (optional)

Requires [Docker Desktop](https://docs.docker.com/desktop/).

```bash
npm run db:start
# Copy printed URL + keys into apps/digest/.env.local and apps/score/.env.local
npm run db:reset
```

## 3. Hosted setup

In Supabase **SQL Editor**, run migrations in order (oldest → newest under `supabase/migrations/`).

Minimum baseline:

1. `supabase/migrations/20260715130113_initial_schema.sql` (Digest)
2. `supabase/migrations/20260715153500_newsroom_staff_publish.sql` (Digest)
3. `supabase/migrations/20260716100000_score_initial_schema.sql` (Score)

Then apply every later file in timestamp order, including:

- `20260806160000_profiles_username.sql`
- `20260806170000_platform_roles_verification.sql`
- `20260807120000_names_and_venues.sql` (first/last name + sport-scoped venues)
- `20260908140000_keeper_events_calendar.sql` (keeper calendar + assignments)

Also set hosted Auth **session timebox to 2 hours** (Dashboard → Authentication → Sessions).

Then run `supabase/seed.sql` for Digest demo content.

Score demo data:

```bash
npm run db:seed:score
```

(requires `SUPABASE_SERVICE_ROLE_KEY` in `apps/score/.env.local`)

## 4. Environment files

**apps/digest/.env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
DEMO_MODE=false
```

**apps/score/.env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

**apps/campus/.env.local** (optional)

```env
NEXT_PUBLIC_DIGEST_URL=http://localhost:3001
NEXT_PUBLIC_SCORE_URL=http://localhost:3002
```

## 5. Auth (shared login — later)

Both apps use the same `auth.users` + `profiles`. Campus will host the unified login page in a future phase.

For now, Digest has `/login` and Score has `/auth/login`.

## 6. Production URLs

Use one parent domain for SSO cookies, e.g.:

- `campus.au.edu.ng`
- `campus.au.edu.ng/digest` or `digest.au.edu.ng`
- `campus.au.edu.ng/score` or `score.au.edu.ng`

Configure redirect URLs in Supabase → Authentication → URL Configuration.
