# AU Score

Campus Sports Analytics Engine — real-time match tracking, league standings, and SofaScore-style profiles for university athletics.

## Stack

- **Next.js 16** (App Router, SSR)
- **Supabase** (PostgreSQL, Auth, Realtime, Storage)
- **TanStack Query** + **TanStack Table**
- **Tailwind CSS** (dark sports-network aesthetic)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Fill in your Supabase credentials (use the SAME project as AU Digest)

# Run dev server — mock data built in, no Supabase required
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to preview the UI. All pages use in-memory demo data from `src/lib/data/demo.ts` — you do **not** need `npm run db:seed` until Supabase is configured.

## Database Setup

1. Create or reuse a Supabase project (shared with AU Digest for centralized auth)
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via Supabase SQL Editor or CLI
3. Seed demo data:

```bash
npm run db:seed
```

## Project Structure

```
src/
  app/                  # Next.js pages (public portal, keeper, admin)
  components/           # UI components (match cards, standings, etc.)
  lib/
    data/demo.ts        # Fallback demo data (no DB required)
    supabase/           # Supabase client helpers
    types/              # TypeScript types
  providers/            # TanStack Query provider
supabase/
  migrations/           # PostgreSQL schema, triggers, RLS
scripts/
  seed.ts               # Database seeding script
docs/
  CENTRALIZED_AUTH.md   # Shared auth with AU Digest
```

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Match Centre — live scores, standings |
| `/matches/[id]` | Live match page with events & win probability |
| `/standings` | League table |
| `/teams`, `/teams/[id]` | Club profiles (SofaScore-style) |
| `/players/[id]` | Player profiles |
| `/keeper` | Record Keeper mobile UI |
| `/admin` | Super Admin dashboard |
| `/auth/login` | Sign in (shared with AU Digest) |

## Centralized Auth

AU Score and AU Digest share one Supabase Auth instance. See [docs/CENTRALIZED_AUTH.md](docs/CENTRALIZED_AUTH.md) for setup.

## Sports Supported

- Football (event ledger, VAR disallowed goals, extra time/penalties)
- Basketball (tap-to-increment, infinite overtime)
- Lawn Tennis (point clicker with backend state machine)
- Track & Field (post-race time entry, heats → finals)

## License

See [LICENSE](LICENSE).
