# AU Campus — Monorepo

Achievers University student platform: **Campus hub**, **AU Digest** (newspaper), and **AU Score** (sports).

## Structure

```
apps/
  campus/     → Hub & app launcher     http://localhost:3000
  digest/     → Campus newspaper       http://localhost:3001
  score/      → Sports platform        http://localhost:3002
supabase/     → Shared database (Digest + Score migrations)
docs/         → Setup guides
```

## Quick start

```bash
# From repo root
npm install

# Run all three frontends
npm run dev

# Or individually
npm run dev:campus   # :3000
npm run dev:digest   # :3001
npm run dev:score    # :3002
```

**No Supabase required for preview:**
- **Digest** — set `DEMO_MODE=true` in `apps/digest/.env.local` (or copy from `.env.example`)
- **Score** — uses built-in demo data automatically
- **Campus** — static hub linking to both apps

## Environment

Copy root `.env.example` to `apps/digest/.env.local` and `apps/score/.env.local` when connecting Supabase.

```bash
cp .env.example apps/digest/.env.local
cp .env.example apps/score/.env.local
```

## Database (when ready)

```bash
npm run db:start    # Docker required
npm run db:reset    # Digest schema + seed
npm run db:seed:score
```

See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Build

```bash
npm run build           # all apps
npm run build:digest
npm run build:score
npm run build:campus
```

## Deploy (Vercel)

**One Vercel project ≠ both apps.** Score and Digest each need their own Vercel project with Root Directory `apps/score` and `apps/digest`. See [docs/DEPLOY.md](docs/DEPLOY.md).
