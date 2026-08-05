# Deploying AU Campus on Vercel

Score and Digest are **separate Next.js apps**. One Vercel project only builds one Root Directory, so pushing to `main` updates **whichever project(s) are linked** — not both automatically unless each has its own project.

## What you have today

| App | Folder | Typical Vercel Root Directory |
|-----|--------|-------------------------------|
| AU Score | `apps/score` | `apps/score` |
| AU Digest | `apps/digest` | `apps/digest` |
| Campus hub | `apps/campus` | `apps/campus` |

If Digest’s last production deploy is still **Jul 23**, that Diget project is not picking up new commits (disconnected, wrong repo, or Root Directory not set to `apps/digest`).

## Add / reconnect AU Digest

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New… → Project**
2. Import **Japheth-Egbedele/AU-Campus** (same GitHub repo as Score)
3. Configure:
   - **Root Directory:** `apps/digest`
   - **Install Command:** `cd ../.. && npm install` (already in `apps/digest/vercel.json`)
   - **Build Command:** `npm run build` (uses the Diget workspace)
   - **Framework:** Next.js
4. Environment variables (same Supabase project as Score):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEMO_MODE=false`
   - `NEXT_PUBLIC_SITE_URL` = your Diget production URL
   - `NEXT_PUBLIC_SCORE_URL` = your Score production URL
   - Paystack keys if editions checkout is live
5. Deploy. Future pushes to `main` that touch Diget (or “Ignore Build Step” unset) will redeploy Diget.

## Score project check

For the existing Score project, Root Directory must be `apps/score`. That project will **not** ship Diget UI changes.

## Optional: Ignore Build Step (monorepo)

So Diget only rebuilds when Diget files change (saves build minutes), set Ignored Build Step in Diget project settings:

```bash
npx turbo-ignore @au/digest
```

Or a simple git path filter:

```bash
git diff HEAD^ HEAD --quiet ./apps/digest ./package-lock.json
```

(Exit `1` = build; exit `0` = skip.)
