# AU Digest — White-Label University Newspaper Platform

> **Monorepo:** This app lives at `apps/digest`. Dev server: **http://localhost:3001**  
> Run from repo root: `npm run dev:digest` or `npm run dev` (all apps).

A digital newspaper platform for universities: a classic NYT-style editorial front page, a newsroom CMS with a writer → editor publishing workflow, paid digital replica editions unlocked through Paystack, and a hardened on-screen reader that watermarks every page with the buyer's identity.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage, RLS everywhere) · Paystack · TanStack Query · Tiptap · pdf.js · next-intl**.

---

## Instant preview (no database)

Want to see the paper populated before setting anything up? Enable demo mode:

```bash
npm install
cp .env.example .env.local   # then set DEMO_MODE=true in .env.local
npm run dev
```

The public site (front page, sections, articles, editions store, ads) renders from built-in fixture content. Auth, the newsroom CMS and payments need a real Supabase connection — set `DEMO_MODE=false` and follow the quick start below when you're ready.

## Quick start

### 1. Requirements

- Node.js 20+
- [Docker Desktop](https://docs.docker.com/desktop/) — required for the local Supabase stack
  (alternatively, use a free hosted project at [supabase.com](https://supabase.com) and skip `supabase start`)

### 2. Install and configure

```bash
npm install
cp .env.example .env.local
```

### 3. Start Supabase (local)

```bash
npm run db:start     # boots Postgres, Auth, Storage in Docker (first run downloads images)
```

`db:start` prints your local `API URL`, `anon key` and `service_role key` — copy them into `.env.local`. Then load the schema and demo content:

```bash
npm run db:reset     # applies migrations + seed.sql
```

Using **hosted Supabase** instead: create a project, run the SQL in `supabase/migrations/` and `supabase/seed.sql` in the SQL editor, and put your project's URL/keys in `.env.local`.

### 4. Paystack

Add your **test secret key** (`sk_test_…`) from the [Paystack dashboard](https://dashboard.paystack.com/#/settings/developers) to `.env.local`. See "Payments" below for webhook setup.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3001.

## Demo accounts (seeded, local only)

| Email | Password | Role |
|---|---|---|
| `admin@demo.test` | `password123` | admin |
| `editor@demo.test` | `password123` | editor |
| `writer@demo.test` | `password123` | writer |
| `reader@demo.test` | `password123` | reader |

## Roles & capabilities

Higher roles inherit everything below them. Enforced in the UI **and** in Postgres RLS.

| Capability | Reader | Writer | Editor | Admin |
|---|:-:|:-:|:-:|:-:|
| Read published articles / buy editions | ✓ | ✓ | ✓ | ✓ |
| Write & edit own drafts, submit for review, upload covers | | ✓ | ✓ | ✓ |
| Delete own drafts | | ✓ | ✓ | ✓ |
| Edit any article, publish / unpublish / feature / reject | | | ✓ | ✓ |
| Approve an article assigned to them (never their own) | | | ✓ | ✓ |
| Manage sections, paid editions, ads | | | ✓ | ✓ |
| Preview paid PDFs without buying | | | ✓ | ✓ |
| Assign roles (Team page) | | | | ✓ |
| View edition sales / revenue | | | | ✓ |

Newsroom desks map roughly to an NYT desk: writers are reporters; editors are desk editors / producers; admins are newsroom managers who can hire (promote roles) without touching the database.

> **Admin does not work while `DEMO_MODE=true`.** Demo mode has no auth backend, so `/admin` redirects to login. Connect Supabase, set `DEMO_MODE=false`, run migrations, then sign in with a seeded staff account.

## How it works

### Editorial workflow (zero-maintenance CMS)

1. **Writers** sign in and open the **Newsroom** (`/admin`) to draft articles in a rich-text editor, upload a cover, and *Submit for review*.
2. **Editors** see articles assigned to them, then *Publish* or *Reject* (with the option to *Feature* a story as the front-page lead). An editor who writes must assign a different editor. Editors also manage **Sections**, **Editions**, **Ads**, **Talent**, and the **Forum**.
3. **Admins** do everything an editor can, plus assign roles on **Team** and see sales totals.
4. Published stories appear on the front page and section pages automatically.

Role changes happen in **Newsroom → Team** (admin only). Nobody can escalate their own role.

### Payments (secure Paystack loop)

1. A signed-in student clicks **Buy issue** — the server initializes a Paystack transaction with the edition and user IDs in its metadata.
2. After checkout, **two independent paths** unlock the issue, both server-side:
   - The **webhook** (`/api/paystack/webhook`) — signature-checked with HMAC-SHA512, then re-verified against Paystack's verify API before a `purchases` row is written with the service role.
   - The **callback fallback** — when Paystack redirects back to the reader, the reference is verified server-to-server on arrival. This makes local development work without a public webhook URL.
3. `purchases` has **no client-side INSERT policy**: only verified, server-recorded payments unlock content.

For production, register the webhook URL (`https://your-domain/api/paystack/webhook`) in the Paystack dashboard. For local webhook testing, tunnel with e.g. `ngrok http 3000`.

### The hardened reader

- Edition PDFs live in a **private** storage bucket; the storage path lives in a table with **no client read policies**. Bytes are only served by `/api/editions/[id]/file` after a session + purchase check, with `Cache-Control: no-store`.
- Pages are rendered to `<canvas>` by pdf.js; the buyer's **email + transaction reference are painted into the canvas** tiled at −45°, so the watermark can't be removed by deleting a DOM overlay.
- Right-click, text selection, copy/cut, drag, long-press (iOS) and Ctrl/Cmd+P/S/C are blocked; a print stylesheet blanks the page.

> Honest caveat: no browser can prevent OS-level screenshots or a camera pointed at the screen. The watermark exists so any leaked copy identifies its buyer — that, plus no raw file access, is the realistic deterrence ceiling for web delivery.

### Ads

Editors manage creatives in **Newsroom → Ads** across three placements: leaderboard (front page + sections), sidebar (front-page rail), and in-feed (articles + section pages). Slots render nothing when no active ad exists.

### Languages

UI chrome is translated with `next-intl` (English and French included; cookie-based switcher in the masthead). To add a language: add the code to `src/i18n/locales.ts` and create `messages/<code>.json`. Articles carry a `language` tag for future filtering.

## White-labelling for another university

This is a deploy-per-university platform. To re-skin:

1. `src/lib/site.ts` — name, masthead, university, tagline.
2. `src/app/globals.css` — swap the three `--accent*` variables (the whole UI follows).
3. Fonts in `src/app/layout.tsx` if desired.
4. Point `.env.local` at that university's own Supabase project and Paystack account. Deploy.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run db:start` / `db:stop` | Local Supabase up / down |
| `npm run db:reset` | Re-apply migrations + seed |

## Security model summary

- **RLS on every table**; anonymous users can only read published articles, published edition metadata (never file paths), sections, and active ads.
- Role checks run through a `security definer` helper in a private schema; users cannot change their own role (enforced in the update policy).
- The service-role key is used only in `src/lib/supabase/admin.ts` (webhook, file proxy, reader page) and is guarded by `server-only`.
- Writers can only create/edit their own unpublished work and cannot self-publish; publishing requires the editor role at the database level, not just in the UI.
