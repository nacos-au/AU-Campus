# Manual setup: short article URLs + forgot password

## 1. Supabase SQL (required for short links)

In **Supabase → SQL Editor**, run:

1. `supabase/digest_short_codes_APPLY_ALL.sql`  
   Adds `articles.short_code`, backfills published/parked pieces, hooks into slug ensure on publish.

Optional if not already applied:

- `supabase/digest_cover_caption_APPLY_ALL.sql`
- `supabase/digest_withdraw_keeps_content_APPLY_ALL.sql`

## 2. Auth redirect URLs (forgot password)

**Supabase → Authentication → URL configuration**

- **Site URL:** Campus production origin (e.g. `https://your-campus.vercel.app`)
- **Redirect URLs** include:
  - `https://your-campus.vercel.app/auth/callback`
  - `https://your-campus.vercel.app/auth/callback?**`
  - `http://localhost:3000/auth/callback` (local)

Free Auth email is enough; rate-limited. Custom SMTP later if you need branded mail.

## 3. Env

Campus / Digest / Score should already have:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CAMPUS_URL` (Digest/Score “Forgot password?” links here)

## 4. After deploy — smoke checks

- Old `/article/long-slug-…` → redirects to `/a/{code}/{title-stem}`
- Share / cards use the short form once `short_code` exists
- Campus `/forgot-password` sends email; link opens `/reset-password`
- Composer: Save works without photo tags; **Submit** blocks until every photo has a description
